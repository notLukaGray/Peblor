/**
 * Condition evaluator for peblor conditionalAction.
 * Handles both shorthand (variable/operator/value) and multi-condition arrays.
 * Exported for use by use-peblor-action-runner and any future evaluators.
 */
import type { JsonValue } from "../../core/lib/json-value";

export type ConditionOperator =
  | "equals"
  | "notEquals"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "isNull"
  | "isNotNull"
  | "in"
  | "notIn"
  | "isEmpty"
  | "isNotEmpty"
  | "hasKey"
  | "notHasKey"
  | "matches";

export interface VariableCondition {
  variable: string;
  operator: ConditionOperator;
  value: JsonValue;
}

/**
 * A nested group of conditions combined with its own logic operator.
 * Enables (A AND B) OR (C AND D) compound expressions.
 */
export interface ConditionGroup {
  logic: "and" | "or";
  conditions: Array<VariableCondition | ConditionGroup>;
}

/** Used for both the primary condition block and elseIf branches. */
export interface VisibleWhenConfig {
  /** Shorthand: single condition via variable/operator/value */
  variable?: string;
  operator?: ConditionOperator;
  value?: JsonValue;
  /** Multi-condition or nested group alternative to shorthand */
  conditions?: Array<VariableCondition | ConditionGroup>;
  /** "and" = all must pass (default); "or" = at least one must pass */
  logic?: "and" | "or";
}

/**
 * Resolves a dot-notation path against the variable store.
 * Tries the literal key first for backward compatibility, then traverses nested
 * objects/arrays. `"products.0.price"` → `variables["products"]?.[0]?.["price"]`.
 */
export function resolveVariablePath(
  variables: Record<string, JsonValue>,
  path: string
): JsonValue | undefined {
  if (path in variables) return variables[path];
  const parts = path.split(".");
  if (parts.length < 2) return variables[path];
  let current: JsonValue | undefined = variables[parts[0]!];
  for (let i = 1; i < parts.length; i++) {
    if (current == null || typeof current !== "object") return undefined;
    const key = parts[i]!;
    if (Array.isArray(current)) {
      const idx = Number(key);
      current = Number.isNaN(idx) ? undefined : current[idx];
    } else {
      current = (current as Record<string, JsonValue>)[key];
    }
  }
  return current;
}

function isConditionGroup(c: VariableCondition | ConditionGroup): c is ConditionGroup {
  return "conditions" in c && Array.isArray((c as ConditionGroup).conditions);
}

function evaluateSingleCondition(
  variableValue: JsonValue | undefined,
  operator: ConditionOperator,
  compareValue: JsonValue | undefined
): boolean {
  // Nullability operators
  if (operator === "isNull") return variableValue == null;
  if (operator === "isNotNull") return variableValue != null;

  // Emptiness operators
  if (operator === "isEmpty") {
    if (variableValue == null) return true;
    if (typeof variableValue === "string") return variableValue.length === 0;
    if (Array.isArray(variableValue)) return variableValue.length === 0;
    if (typeof variableValue === "object") return Object.keys(variableValue).length === 0;
    // Numbers and booleans are never empty — they represent concrete values
    if (typeof variableValue === "number" || typeof variableValue === "boolean") return false;
    return false;
  }
  if (operator === "isNotEmpty") {
    if (variableValue == null) return false;
    if (typeof variableValue === "string") return variableValue.length > 0;
    if (Array.isArray(variableValue)) return variableValue.length > 0;
    if (typeof variableValue === "object") return Object.keys(variableValue).length > 0;
    // Numbers and booleans are always non-empty — they represent concrete values
    if (typeof variableValue === "number" || typeof variableValue === "boolean") return true;
    return false;
  }

  // Object key operators
  if (operator === "hasKey") {
    return (
      variableValue != null &&
      typeof variableValue === "object" &&
      !Array.isArray(variableValue) &&
      typeof compareValue === "string" &&
      compareValue in (variableValue as Record<string, JsonValue>)
    );
  }
  if (operator === "notHasKey") {
    if (variableValue == null || typeof variableValue !== "object" || Array.isArray(variableValue))
      return true;
    return (
      typeof compareValue !== "string" ||
      !(compareValue in (variableValue as Record<string, JsonValue>))
    );
  }

  // Regex match
  if (operator === "matches") {
    try {
      return (
        typeof compareValue === "string" &&
        new RegExp(compareValue).test(String(variableValue ?? ""))
      );
    } catch (err) {
      console.warn("[pb-contracts] Invalid regex pattern in condition evaluator", err);
      return false;
    }
  }

  switch (operator) {
    case "equals":
      return compareValue != null && Object.is(variableValue, compareValue);
    case "notEquals":
      return compareValue == null || !Object.is(variableValue, compareValue);
    case "gt":
      return (
        variableValue != null &&
        compareValue != null &&
        Number(variableValue) > Number(compareValue)
      );
    case "gte":
      return (
        variableValue != null &&
        compareValue != null &&
        Number(variableValue) >= Number(compareValue)
      );
    case "lt":
      return (
        variableValue != null &&
        compareValue != null &&
        Number(variableValue) < Number(compareValue)
      );
    case "lte":
      return (
        variableValue != null &&
        compareValue != null &&
        Number(variableValue) <= Number(compareValue)
      );
    case "contains":
      return (
        variableValue != null &&
        compareValue != null &&
        String(variableValue).includes(String(compareValue))
      );
    case "startsWith":
      return (
        variableValue != null &&
        compareValue != null &&
        String(variableValue).startsWith(String(compareValue))
      );
    case "endsWith":
      return (
        variableValue != null &&
        compareValue != null &&
        String(variableValue).endsWith(String(compareValue))
      );
    case "in":
      return Array.isArray(compareValue) && compareValue.some((v) => Object.is(variableValue, v));
    case "notIn":
      return !Array.isArray(compareValue) || !compareValue.some((v) => Object.is(variableValue, v));
    default:
      return false;
  }
}

function evaluateConditionItem(
  item: VariableCondition | ConditionGroup,
  variables: Record<string, JsonValue>
): boolean {
  if (isConditionGroup(item)) {
    return evaluateConditions({ conditions: item.conditions, logic: item.logic }, variables);
  }
  return evaluateSingleCondition(
    resolveVariablePath(variables, item.variable),
    item.operator,
    item.value
  );
}

/**
 * Evaluates a condition block against the current variable store snapshot.
 *
 * Supports:
 * - Shorthand: `{ variable, operator, value }` — single condition
 * - Multi-condition: `{ conditions: [...], logic: "and" | "or" }`
 * - Nested groups: `{ conditions: [{ logic: "or", conditions: [...] }, ...] }`
 * - Dot-path variable resolution: `"products.0.price"` traverses nested objects/arrays
 *
 * If neither form is provided, returns `false` — fail closed.
 */
export function evaluateConditions(
  config: VisibleWhenConfig,
  variables: Record<string, JsonValue>
): boolean {
  const logic = config.logic ?? "and";

  // Multi-condition array form (supports nested ConditionGroup items)
  if (config.conditions && config.conditions.length > 0) {
    const results = config.conditions.map((item) => evaluateConditionItem(item, variables));
    return logic === "or" ? results.some(Boolean) : results.every(Boolean);
  }

  // Shorthand form
  if (config.variable !== undefined && config.operator !== undefined) {
    return evaluateSingleCondition(
      resolveVariablePath(variables, config.variable),
      config.operator,
      config.value
    );
  }

  // No valid condition specified — fail closed
  return false;
}

/**
 * Collect the root Zustand subscription keys from a VisibleWhenConfig.
 * Dot-path variables like "products.0.price" → root key "products".
 * Handles nested ConditionGroup recursively.
 */
export function collectConditionVariableRoots(config: VisibleWhenConfig): Set<string> {
  const roots = new Set<string>();
  const addPath = (path: string) => roots.add(path.split(".")[0]!);

  if (config.variable) addPath(config.variable);

  function walkItems(items: Array<VariableCondition | ConditionGroup>) {
    for (const item of items) {
      if (isConditionGroup(item)) walkItems(item.conditions);
      else addPath(item.variable);
    }
  }

  walkItems(config.conditions ?? []);
  return roots;
}

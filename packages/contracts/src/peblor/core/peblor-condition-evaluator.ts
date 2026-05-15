/**
 * Condition evaluator for peblor conditionalAction.
 * Handles both shorthand (variable/operator/value) and multi-condition arrays.
 * Exported for use by use-peblor-action-runner and any future evaluators.
 */
import type { JsonPrimitive, JsonValue } from "../../core/lib/json-value";

export type ConditionOperator =
  | "equals"
  | "notEquals"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "startsWith";

export interface VariableCondition {
  variable: string;
  operator: ConditionOperator;
  value: JsonPrimitive;
}

/** Used for both the primary condition block and elseIf branches. */
export interface VisibleWhenConfig {
  /** Shorthand: single condition via variable/operator/value */
  variable?: string;
  operator?: ConditionOperator;
  value?: JsonPrimitive;
  /** Multi-condition alternative to shorthand */
  conditions?: VariableCondition[];
  /** "and" = all must pass (default); "or" = at least one must pass */
  logic?: "and" | "or";
}

function evaluateSingleCondition(
  variableValue: JsonValue | undefined,
  operator: ConditionOperator,
  compareValue: JsonValue | undefined
): boolean {
  if (compareValue == null) return false;
  switch (operator) {
    case "equals":
      return Object.is(variableValue, compareValue);
    case "notEquals":
      return !Object.is(variableValue, compareValue);
    case "gt":
    case "gte":
    case "lt":
    case "lte":
    case "contains":
    case "startsWith":
      if (variableValue == null) return false;
      if (operator === "gt") return Number(variableValue) > Number(compareValue);
      if (operator === "gte") return Number(variableValue) >= Number(compareValue);
      if (operator === "lt") return Number(variableValue) < Number(compareValue);
      if (operator === "lte") return Number(variableValue) <= Number(compareValue);
      if (operator === "contains") return String(variableValue).includes(String(compareValue));
      return String(variableValue).startsWith(String(compareValue));
    default:
      return false;
  }
}

/**
 * Evaluates a condition block against the current variable store snapshot.
 *
 * Supports:
 * - Shorthand: `{ variable, operator, value }` — single condition
 * - Multi-condition: `{ conditions: [...], logic: "and" | "or" }`
 *
 * If neither form is provided (empty object, empty conditions array, or no
 * shorthand), returns `false` — fail closed.
 *
 * @param config  The condition configuration from the action payload.
 * @param variables  A snapshot of the variable store (`useVariableStore.getState().variables`).
 */
export function evaluateConditions(
  config: VisibleWhenConfig,
  variables: Record<string, JsonValue>
): boolean {
  const logic = config.logic ?? "and";

  // Multi-condition array form
  if (config.conditions && config.conditions.length > 0) {
    const results = config.conditions.map((cond) =>
      evaluateSingleCondition(variables[cond.variable], cond.operator, cond.value)
    );
    return logic === "or" ? results.some(Boolean) : results.every(Boolean);
  }

  // Shorthand form
  if (config.variable !== undefined && config.operator !== undefined) {
    return evaluateSingleCondition(variables[config.variable], config.operator, config.value);
  }

  // No valid condition specified — fail closed
  return false;
}

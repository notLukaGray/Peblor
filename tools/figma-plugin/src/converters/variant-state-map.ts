/**
 * Variant state information map — maps state value strings to interaction metadata.
 */

export interface VariantStateInfo {
  /** This is the default/base state — no trigger needed to enter it. */
  isBase?: boolean;
  /** peblor interactions key to ENTER this state. */
  trigger?: string;
  /** peblor interactions key to EXIT this state (reset to base). */
  release?: string;
  /** Value set on the state variable when entering this state. */
  stateValue?: string;
  /** onClick toggles between this state and base. */
  toggle?: boolean;
  /** Terminal states are not interaction-triggered (disabled, error, loading). */
  terminal?: boolean;
  /** Direct prop to set on the element (used by disabled). */
  prop?: string;
  /**
   * Gesture states (hover / press) are candidates for the tween-first path.
   * When true the converter attempts `whileHover` / `whileTap` before show/hide.
   */
  gesture?: boolean;
  /** FM gesture prop name for tween mode ("whileHover" | "whileTap"). */
  gestureProp?: "whileHover" | "whileTap";
}

export const VARIANT_STATE_MAP: Record<string, VariantStateInfo> = {
  // Base / identity
  default: { isBase: true },
  rest: { isBase: true },
  normal: { isBase: true },
  initial: { isBase: true },
  idle: { isBase: true },

  // Hover — gesture candidates (tween-first)
  hover: {
    trigger: "onHoverEnter",
    release: "onHoverLeave",
    stateValue: "hover",
    gesture: true,
    gestureProp: "whileHover",
  },
  hovered: {
    trigger: "onHoverEnter",
    release: "onHoverLeave",
    stateValue: "hover",
    gesture: true,
    gestureProp: "whileHover",
  },

  // Press — gesture candidates (tween-first)
  pressed: {
    trigger: "onPointerDown",
    release: "onPointerUp",
    stateValue: "pressed",
    gesture: true,
    gestureProp: "whileTap",
  },
  down: {
    trigger: "onPointerDown",
    release: "onPointerUp",
    stateValue: "pressed",
    gesture: true,
    gestureProp: "whileTap",
  },
  active: {
    trigger: "onPointerDown",
    release: "onPointerUp",
    stateValue: "active",
    gesture: true,
    gestureProp: "whileTap",
  },

  // Click toggle
  selected: { trigger: "onClick", stateValue: "selected", toggle: true },
  checked: { trigger: "onClick", stateValue: "checked", toggle: true },
  on: { trigger: "onClick", stateValue: "on", toggle: true },
  open: { trigger: "onClick", stateValue: "open", toggle: true },
  expanded: { trigger: "onClick", stateValue: "expanded", toggle: true },

  // Focus (best-effort)
  focus: { trigger: "onClick", stateValue: "focus" },
  focused: { trigger: "onClick", stateValue: "focus" },

  // Terminal states
  disabled: { terminal: true, prop: "disabled" },
  loading: { terminal: true, stateValue: "loading" },
  error: { terminal: true, stateValue: "error" },
  invalid: { terminal: true, stateValue: "error" },
};

/** Variant property key names that drive interaction state. */
export const STATE_PROPERTY_KEYS = ["state", "mode", "status", "variant"];

export interface VariantGroup {
  /** The default variant node. */
  defaultVariant: ComponentNode;
  /** All non-base, non-terminal variants mapped by their state value. */
  states: Map<string, { node: ComponentNode; info: VariantStateInfo }>;
  /** Terminal variants (disabled, loading, error) by their state value. */
  terminals: Map<string, { node: ComponentNode; info: VariantStateInfo }>;
  /** The variant property key that drives state (e.g. "State"). */
  statePropertyKey: string;
  /** Non-state variant properties from the default variant (e.g. "Size" → "Large"). */
  otherProperties: Map<string, string>;
  /** Whether a selector-based family filter matched the chosen variant bucket. */
  matchedFamily?: boolean;
}

type VariantPropertyValue = string | number | boolean;
type VariantPropertyMap = Record<string, VariantPropertyValue>;

function normalizeVariantPropertyValue(value: unknown): string | undefined {
  if (typeof value === "string") return value.toLowerCase();
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isFinite(value)) return String(value).toLowerCase();
  return undefined;
}

/** Parses "State=Default, Size=Large" into { State: "Default", Size: "Large" }. */
export function parseVariantName(name: string): Record<string, string> {
  const result: Record<string, string> = {};
  const parts = name.split(",");
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const value = part.slice(eqIdx + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

/** Returns the state variable key for a component group element ID: "{elementId}--state" */
export function getStateVariableKey(elementId: string): string {
  return `${elementId}--state`;
}

function getVariantProperties(
  node: Pick<ComponentNode, "name" | "variantProperties">
): VariantPropertyMap {
  const props = node.variantProperties;
  if (props != null && Object.keys(props).length > 0) {
    return props as unknown as VariantPropertyMap;
  }
  return parseVariantName(node.name);
}

function getVariantPropertyValue(props: VariantPropertyMap, key: string): string | undefined {
  if (props[key] !== undefined) return normalizeVariantPropertyValue(props[key]);
  const normalizedKey = key.toLowerCase();
  for (const [propKey, propValue] of Object.entries(props)) {
    if (propKey.toLowerCase() === normalizedKey) {
      return normalizeVariantPropertyValue(propValue);
    }
  }
  return undefined;
}

function normalizeVariantProperties(
  props: VariantPropertyMap,
  omitKey?: string
): Record<string, string> {
  const normalized: Record<string, string> = {};
  const omitKeyLower = omitKey?.toLowerCase();
  for (const [key, value] of Object.entries(props)) {
    if (omitKeyLower && key.toLowerCase() === omitKeyLower) continue;
    const normalizedValue = normalizeVariantPropertyValue(value);
    if (normalizedValue === undefined) continue;
    normalized[key.toLowerCase()] = normalizedValue;
  }
  return normalized;
}

function signatureFromProperties(props: Record<string, string>): string {
  return Object.entries(props)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("|");
}

/**
 * Extracts the variant group structure from a COMPONENT_SET node.
 * Returns null if no recognizable state property is found.
 */
export function extractVariantGroup(
  componentSet: ComponentSetNode,
  selector?: Record<string, unknown> | null
): VariantGroup | null {
  const children = componentSet.children.filter((n): n is ComponentNode => n.type === "COMPONENT");
  if (children.length === 0) return null;

  const childVariants = children.map((child) => ({
    node: child,
    props: getVariantProperties(child),
  }));
  let statePropertyKey: string | null = null;

  for (const { props } of childVariants) {
    const byName = Object.keys(props).find((k) => STATE_PROPERTY_KEYS.includes(k.toLowerCase()));
    if (byName) {
      statePropertyKey = byName;
      break;
    }
  }

  if (!statePropertyKey) {
    for (const { props } of childVariants) {
      const byValue = Object.keys(props).find(
        (k) =>
          VARIANT_STATE_MAP[getVariantPropertyValue(props, k)?.toLowerCase() ?? ""] !== undefined
      );
      if (byValue) {
        statePropertyKey = byValue;
        break;
      }
    }
  }

  if (!statePropertyKey) return null;

  const selectorProps = selector
    ? normalizeVariantProperties(selector as VariantPropertyMap, statePropertyKey)
    : null;
  const shouldFilterFamilies = !!selectorProps && Object.keys(selectorProps).length > 0;

  const familyBuckets = new Map<
    string,
    {
      props: VariantPropertyMap;
      nodes: Array<{ node: ComponentNode; props: VariantPropertyMap }>;
    }
  >();

  for (const childVariant of childVariants) {
    const familyProps = normalizeVariantProperties(childVariant.props, statePropertyKey);
    const signature = signatureFromProperties(familyProps);
    const bucket = familyBuckets.get(signature);
    if (bucket) {
      bucket.nodes.push(childVariant);
    } else {
      familyBuckets.set(signature, { props: familyProps, nodes: [childVariant] });
    }
  }

  let selectedNodes = childVariants;
  let matchedFamily = !shouldFilterFamilies;

  if (shouldFilterFamilies) {
    let selectedBucket:
      | {
          props: VariantPropertyMap;
          nodes: Array<{ node: ComponentNode; props: VariantPropertyMap }>;
        }
      | undefined;
    let selectedScore = -1;

    for (const bucket of familyBuckets.values()) {
      const matches = Object.entries(bucket.props).every(([propKey, propValue]) => {
        return selectorProps[propKey] === propValue;
      });
      if (!matches) continue;

      const score = Object.keys(bucket.props).length;
      if (score > selectedScore) {
        selectedBucket = bucket;
        selectedScore = score;
      }
    }

    if (selectedBucket) {
      selectedNodes = selectedBucket.nodes;
      matchedFamily = true;
    } else {
      selectedNodes = familyBuckets.values().next().value?.nodes ?? childVariants;
    }
  }

  let defaultVariant: ComponentNode | null = null;
  const states = new Map<string, { node: ComponentNode; info: VariantStateInfo }>();
  const terminals = new Map<string, { node: ComponentNode; info: VariantStateInfo }>();

  for (const { node: child, props } of selectedNodes) {
    const rawValue = getVariantPropertyValue(props, statePropertyKey);
    if (rawValue === undefined) continue;

    const normalizedValue = rawValue.toLowerCase();
    const info = VARIANT_STATE_MAP[normalizedValue];

    if (!info) {
      states.set(normalizedValue, { node: child, info: { stateValue: normalizedValue } });
      continue;
    }

    if (info.isBase) {
      defaultVariant = child;
    } else if (info.terminal) {
      terminals.set(info.stateValue ?? normalizedValue, { node: child, info });
    } else {
      states.set(info.stateValue ?? normalizedValue, { node: child, info });
    }
  }

  const resolvedDefaultVariant = defaultVariant ?? selectedNodes[0]?.node ?? children[0];

  const otherProperties = new Map<string, string>();
  const defaultPairs = getVariantProperties(resolvedDefaultVariant);
  for (const [k, v] of Object.entries(defaultPairs)) {
    if (k !== statePropertyKey) otherProperties.set(k, String(v));
  }

  return {
    defaultVariant: resolvedDefaultVariant,
    states,
    terminals,
    statePropertyKey,
    otherProperties,
    matchedFamily,
  };
}

/** Serializable node snapshot for widget + tests (no Figma types). */
export interface InspectableNode {
  id: string;
  name: string;
  type: string;
  width: number;
  height: number;
  childCount: number;
  hasAutoLayout: boolean;
  /** Figma overflowDirection when present (FRAME-like nodes). */
  overflowDirection?: "NONE" | "HORIZONTAL" | "VERTICAL" | "BOTH";
  /** Primary fill kind for quick UX hints (solid, gradient, image, none, mixed). */
  primaryFillKind?: "none" | "solid" | "gradient" | "image" | "mixed";
  /** True when any inspected numeric field uses a Figma variable binding. */
  hasVariableBindings?: boolean;
}

/** Optional tree context from the Figma document (when available). */
export interface InspectContext {
  parentName?: string;
  parentType?: string;
  /** 0-based index among visible siblings */
  siblingIndex?: number;
  siblingCount?: number;
  /** Main component name for INSTANCE nodes */
  mainComponentName?: string;
  /** Resolved text style name for TEXT nodes */
  textStyleName?: string;
  /** Rounded font size (px) when single-valued on TEXT */
  fontSizePx?: number;
}

import type { ParsedExportTargetKind } from "../../figma-bridge/src/index";
import type { InspectableNode, InspectContext } from "../../figma-bridge/src/index";

// Re-export for consumers
export type { InspectableNode, InspectContext };

// ── Audit types ───────────────────────────────────────────────────────────────

/** One row in the page audit table — one per top-level FRAME node. */
export interface FrameAuditRow {
  frameId: string;
  frameName: string;
  exportKind: ParsedExportTargetKind;
  exportKey: string;
  /** Warnings from getLayerPrefixDiagnostics (unknown prefix, missing name, etc.) */
  prefixWarnings: string[];
  /** Only set for Section[Desktop]/* and Section[Mobile]/* frames. */
  responsiveRole: "desktop" | "mobile" | null;
  pairStatus: "paired" | "orphan" | "n/a";
  /** Frame name of the paired counterpart, when paired. */
  pairedWithName?: string;
}

// ── Widget state ──────────────────────────────────────────────────────────────

export interface WidgetState {
  activeTab: "audit" | "keys";

  // Audit tab
  lastScannedPageName: string;
  auditRows: FrameAuditRow[];

  // Keys tab
  keyFilter: string;
  keyScope: "all" | "element" | "section";

  // Minimal inspector footer (selection-reactive)
  inspectedNodeName: string;
  inspectedExportKind: string;
  inspectedExportKey: string;
}

export const INITIAL_WIDGET_STATE: WidgetState = {
  activeTab: "audit",
  lastScannedPageName: "",
  auditRows: [],
  keyFilter: "",
  keyScope: "all",
  inspectedNodeName: "",
  inspectedExportKind: "",
  inspectedExportKey: "",
};

// ── Node inspection helpers (used by useEffect in widget-main) ────────────────
// These access Figma node internals to build the serialisable InspectableNode
// and InspectContext shapes.

export function buildInspectableNodePayload(node: SceneNode): InspectableNode {
  const w = Math.round(node.width ?? 0);
  const h = Math.round(node.height ?? 0);
  const children = node.children ?? [];
  const frameLike = node as SceneNode & {
    layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
    overflowDirection?: InspectableNode["overflowDirection"];
    fills?: unknown;
    boundVariables?: Record<string, unknown>;
  };
  const hasAutoLayout =
    "layoutMode" in frameLike &&
    frameLike.layoutMode !== undefined &&
    frameLike.layoutMode !== "NONE";
  let overflowDirection: InspectableNode["overflowDirection"];
  if ("overflowDirection" in frameLike) {
    overflowDirection = frameLike.overflowDirection;
  }
  let primaryFillKind: InspectableNode["primaryFillKind"] = "none";
  const rawFills = "fills" in frameLike ? frameLike.fills : undefined;
  if (Array.isArray(rawFills)) {
    const visible = (rawFills as Paint[]).filter((f) => f.visible !== false);
    if (visible.length === 0) primaryFillKind = "none";
    else if (visible.length > 1) primaryFillKind = "mixed";
    else {
      const t = visible[0]!.type;
      if (t === "SOLID") primaryFillKind = "solid";
      else if (t === "IMAGE") primaryFillKind = "image";
      else primaryFillKind = "gradient";
    }
  }
  let hasVariableBindings = false;
  if (frameLike.boundVariables && typeof frameLike.boundVariables === "object") {
    hasVariableBindings = Object.keys(frameLike.boundVariables).length > 0;
  }
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    width: w,
    height: h,
    childCount: children.length,
    hasAutoLayout,
    overflowDirection,
    primaryFillKind,
    hasVariableBindings,
  };
}

export function buildInspectContext(node: SceneNode): InspectContext {
  const parent = node.parent;
  let parentName: string | undefined;
  let parentType: string | undefined;
  let siblingIndex: number | undefined;
  let siblingCount: number | undefined;
  if (parent && "children" in parent) {
    const ch = parent.children as readonly SceneNode[];
    siblingCount = ch.length;
    const idx = ch.indexOf(node);
    siblingIndex = idx >= 0 ? idx : undefined;
  }
  if (parent && "name" in parent && typeof parent.name === "string") {
    parentName = parent.name;
    parentType = parent.type;
  }
  let mainComponentName: string | undefined;
  if (node.type === "INSTANCE") {
    mainComponentName = (node as InstanceNode).mainComponent?.name ?? undefined;
  }
  let textStyleName: string | undefined;
  let fontSizePx: number | undefined;
  if (node.type === "TEXT") {
    const t = node as TextNode;
    const styleId = t.textStyleId;
    if (typeof styleId === "string" && styleId.length > 0) {
      const st = figma.getLocalTextStyles().find((s) => s.id === styleId);
      if (st) textStyleName = st.name;
    }
    const fs = t.fontSize;
    if (typeof fs === "number") {
      fontSizePx = Math.round(fs);
    }
  }
  return {
    parentName,
    parentType,
    siblingIndex,
    siblingCount,
    mainComponentName,
    textStyleName,
    fontSizePx,
  };
}

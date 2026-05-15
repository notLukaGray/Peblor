/**
 * Server-only: resolve responsive [mobile, desktop] and { mobile?, desktop? } values
 * for a single breakpoint so the client receives a pre-resolved tree and can skip
 * useDeviceType / resolution on first paint. JSON keeps full flexibility; we only
 * resolve at request time from User-Agent (or explicit isMobile).
 */

import { resolveResponsiveValue } from "../lib/responsive-value";
import { resolveElementBlockForBreakpoint } from "./element-layout-utils/breakpoint-resolution";
import {
  resolveColumnAssignments,
  resolveColumnCount,
  resolveColumnGaps,
  resolveColumnSpan,
  resolveColumnStyles,
  resolveColumnWidths,
  resolveElementOrder,
  resolveGridMode,
  resolveItemLayout,
  resolveItemStyles,
} from "./section-column-layout";
import type {
  ColumnAssignmentsInput,
  ColumnCountInput,
  ColumnGapsInput,
  ColumnSpanInput,
  ColumnStylesInput,
  ColumnWidthsInput,
  ElementOrderInput,
  ElementWithId,
  GridModeInput,
  ItemLayoutInput,
  ItemStylesInput,
} from "./section-column-layout";
import type {
  bgBlock,
  ElementBlock,
  FormFieldBlock,
  SectionBlock,
} from "@pb/contracts/peblor/core/peblor-schemas";
import {
  resolveResponsiveBooleanProp,
  resolveResponsiveStringProp,
} from "./section-column-prop-normalizers";
import { MOBILE_UA_REGEX } from "../lib/shared-utils";

/**
 * Derive isMobile from User-Agent string. Use when resolving breakpoint on the server
 * (e.g. from headers().get("user-agent")). Matches device-type-provider UA logic.
 */
export function isMobileFromUserAgent(userAgent: string): boolean {
  return MOBILE_UA_REGEX.test(userAgent);
}

/** Resolve responsive value that may be tuple [mobile, desktop] or object { mobile?, desktop? }. */
function resolveForBreakpoint<T>(value: unknown, isMobile: boolean): T | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return (isMobile ? value[0] : value[1]) as T;
  if (value !== null && typeof value === "object" && ("mobile" in value || "desktop" in value)) {
    const r = value as { mobile?: T; desktop?: T };
    return (isMobile ? (r.mobile ?? r.desktop) : (r.desktop ?? r.mobile)) as T;
  }
  return value as T;
}

/** True if value is responsive (array or { mobile?, desktop? }), so we must copy to resolve. */
function valueNeedsBreakpointResolution(value: unknown): boolean {
  if (value === undefined) return false;
  if (Array.isArray(value)) return value.length === 2;
  if (value !== null && typeof value === "object") return "mobile" in value || "desktop" in value;
  return false;
}

/** Resolve responsive values in a bg block (and recurse into backgroundTransition from/to). */
function resolveBgBlockForBreakpoint(block: bgBlock, isMobile: boolean): bgBlock {
  const rec = block as Record<string, unknown>;
  const needsCopy = Object.keys(rec).some(
    (key) => key !== "type" && rec[key] !== undefined && valueNeedsBreakpointResolution(rec[key])
  );
  if (!needsCopy && rec.type !== "backgroundTransition") return block;

  const out = { ...rec };
  for (const key of Object.keys(out)) {
    if (out[key] !== undefined && valueNeedsBreakpointResolution(out[key])) {
      out[key] = resolveForBreakpoint(out[key], isMobile);
    }
  }
  if (out.type === "backgroundTransition") {
    const from = out.from as bgBlock | undefined;
    const to = out.to as bgBlock | undefined;
    if (from && typeof from === "object" && "type" in from) {
      out.from = resolveBgBlockForBreakpoint(from, isMobile);
    }
    if (to && typeof to === "object" && "type" in to) {
      out.to = resolveBgBlockForBreakpoint(to, isMobile);
    }
  }
  return out as bgBlock;
}

const BASE_SECTION_RESPONSIVE_KEYS = [
  "ariaLabel",
  "fill",
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "align",
  "marginLeft",
  "marginRight",
  "marginTop",
  "marginBottom",
  "borderRadius",
  "aspectRatio",
  "initialX",
  "initialY",
  "stickyOffset",
  "fixedOffset",
] as const;

function resolveBaseSectionProps(
  section: Record<string, unknown>,
  isMobile: boolean
): Record<string, unknown> {
  const needsCopy = BASE_SECTION_RESPONSIVE_KEYS.some(
    (key) => key in section && valueNeedsBreakpointResolution(section[key])
  );
  if (!needsCopy) return section;
  const out = { ...section };
  for (const key of BASE_SECTION_RESPONSIVE_KEYS) {
    if (key in section && section[key] !== undefined) {
      out[key] = resolveForBreakpoint(section[key], isMobile);
    }
  }
  return out;
}

function resolveElementBlock(block: ElementBlock, isMobile: boolean): ElementBlock {
  return resolveElementBlockForBreakpoint(block, isMobile);
}

const FORM_FIELD_RESPONSIVE_KEYS = [
  "width",
  "align",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "textAlign",
  "padding",
  "fill",
  "stroke",
  "borderRadius",
  "borderWidth",
  "level",
  "gap",
] as const;

function resolveFormFieldBlock(field: FormFieldBlock, isMobile: boolean): FormFieldBlock {
  const nestedFields =
    field.fieldType === "row"
      ? field.fields?.map((f) => resolveFormFieldBlock(f, isMobile))
      : undefined;
  const needsCopy = FORM_FIELD_RESPONSIVE_KEYS.some(
    (key) => key in field && valueNeedsBreakpointResolution((field as Record<string, unknown>)[key])
  );
  if (!needsCopy && !nestedFields) return field;
  const out = { ...field } as Record<string, unknown>;
  if (nestedFields) out.fields = nestedFields;
  for (const key of FORM_FIELD_RESPONSIVE_KEYS) {
    if (key in field && (field as Record<string, unknown>)[key] !== undefined) {
      (out as Record<string, unknown>)[key] = resolveResponsiveValue(
        (field as Record<string, unknown>)[key],
        isMobile
      );
    }
  }
  return out as FormFieldBlock;
}

function resolveSectionBlock(block: SectionBlock, isMobile: boolean): SectionBlock {
  const type = block.type;
  const base = resolveBaseSectionProps(block as Record<string, unknown>, isMobile) as SectionBlock;
  if (
    base === (block as Record<string, unknown>) &&
    (type === "divider" || type === "sectionTrigger")
  ) {
    return block;
  }
  if (type === "divider" || type === "sectionTrigger") {
    return base;
  }

  if (type === "sectionColumn") {
    const col = block as SectionBlock & {
      elements?: ElementWithId[];
      columns?: ColumnCountInput;
      columnAssignments?: ColumnAssignmentsInput;
      columnWidths?: ColumnWidthsInput;
      columnGaps?: ColumnGapsInput;
      columnStyles?: ColumnStylesInput;
      columnSpan?: ColumnSpanInput;
      itemStyles?: ItemStylesInput;
      gridMode?: GridModeInput;
      gridDebug?: boolean | { mobile?: boolean; desktop?: boolean };
      gridAutoRows?: string | [string, string] | { mobile?: string; desktop?: string };
      elementOrder?: ElementOrderInput;
      itemLayout?: ItemLayoutInput;
      contentWidth?: unknown;
      contentHeight?: unknown;
    };
    const isDesktop = !isMobile;
    const elements = col.elements ?? [];
    return {
      ...base,
      type: "sectionColumn",
      elements: elements.map((el) => resolveElementBlock(el as ElementBlock, isMobile)),
      columns: resolveColumnCount(col.columns, isDesktop),
      columnAssignments: resolveColumnAssignments(col.columnAssignments, isDesktop),
      columnWidths: resolveColumnWidths(col.columnWidths, isDesktop),
      columnGaps: resolveColumnGaps(col.columnGaps, isDesktop),
      columnStyles: resolveColumnStyles(col.columnStyles, isDesktop),
      columnSpan: resolveColumnSpan(col.columnSpan, isDesktop),
      itemStyles: resolveItemStyles(col.itemStyles, isDesktop),
      gridMode: resolveGridMode(col.gridMode, isDesktop),
      gridDebug: resolveResponsiveBooleanProp(col.gridDebug, isMobile),
      gridAutoRows: resolveResponsiveStringProp(col.gridAutoRows, isMobile),
      elementOrder: resolveElementOrder(col.elementOrder, elements, isDesktop),
      itemLayout: resolveItemLayout(col.itemLayout, isDesktop),
      contentWidth: resolveForBreakpoint(col.contentWidth, isMobile),
      contentHeight: resolveForBreakpoint(col.contentHeight, isMobile),
    } as SectionBlock;
  }

  if (type === "contentBlock") {
    const content = block as SectionBlock & {
      elements?: ElementBlock[];
      contentWidth?: unknown;
      contentHeight?: unknown;
      flexDirection?: unknown;
      alignItems?: unknown;
      justifyContent?: unknown;
      flexWrap?: unknown;
      gap?: unknown;
      rowGap?: unknown;
      columnGap?: unknown;
    };
    const elements = content.elements ?? [];
    return {
      ...base,
      type: "contentBlock",
      elements: elements.map((el) => resolveElementBlock(el, isMobile)),
      contentWidth: resolveForBreakpoint(content.contentWidth, isMobile),
      contentHeight: resolveForBreakpoint(content.contentHeight, isMobile),
      flexDirection: resolveForBreakpoint(content.flexDirection, isMobile),
      alignItems: resolveForBreakpoint(content.alignItems, isMobile),
      justifyContent: resolveForBreakpoint(content.justifyContent, isMobile),
      flexWrap: resolveForBreakpoint(content.flexWrap, isMobile),
      gap: resolveForBreakpoint(content.gap, isMobile),
      rowGap: resolveForBreakpoint(content.rowGap, isMobile),
      columnGap: resolveForBreakpoint(content.columnGap, isMobile),
    } as SectionBlock;
  }

  if (type === "scrollContainer") {
    const scroll = block as SectionBlock & { elements?: ElementBlock[] };
    const elements = scroll.elements ?? [];
    return {
      ...base,
      type: "scrollContainer",
      elements: elements.map((el) => resolveElementBlock(el, isMobile)),
    } as SectionBlock;
  }

  if (type === "formBlock") {
    const form = block as SectionBlock & {
      fields?: FormFieldBlock[];
      contentWidth?: unknown;
      contentHeight?: unknown;
    };
    const fields = form.fields ?? [];
    return {
      ...base,
      type: "formBlock",
      fields: fields.map((f) => resolveFormFieldBlock(f, isMobile)),
      contentWidth: resolveForBreakpoint(form.contentWidth, isMobile),
      contentHeight: resolveForBreakpoint(form.contentHeight, isMobile),
    } as SectionBlock;
  }

  if (type === "revealSection") {
    const reveal = block as SectionBlock & {
      collapsedElements?: ElementBlock[];
      revealedElements?: ElementBlock[];
    };
    const collapsed = reveal.collapsedElements ?? [];
    const revealed = reveal.revealedElements ?? [];
    return {
      ...base,
      type: "revealSection",
      collapsedElements: collapsed.map((el) => resolveElementBlock(el, isMobile)),
      revealedElements: revealed.map((el) => resolveElementBlock(el, isMobile)),
    } as SectionBlock;
  }

  if (type === "divider" || type === "sectionTrigger") {
    return base;
  }

  return base;
}

export type ResolvePeblorBreakpointParams = {
  sections: SectionBlock[];
  bg: bgBlock | null;
  bgDefinitions: Record<string, bgBlock>;
  isMobile: boolean;
};

export type ResolvePeblorBreakpointResult = {
  sections: SectionBlock[];
  bg: bgBlock | null;
  bgDefinitions: Record<string, bgBlock>;
};

/**
 * Resolve every responsive value in the page tree for the given breakpoint.
 * Returns a new tree (no mutation). Use when you have isMobile from the request
 * (e.g. User-Agent) so the client can render without useDeviceType on first paint.
 */
export function resolvePeblorBreakpoint({
  sections,
  bg,
  bgDefinitions,
  isMobile,
}: ResolvePeblorBreakpointParams): ResolvePeblorBreakpointResult {
  const resolvedBg = bg ? resolveBgBlockForBreakpoint(bg, isMobile) : null;
  const resolvedBgDefinitions: Record<string, bgBlock> = {};
  for (const [key, block] of Object.entries(bgDefinitions)) {
    resolvedBgDefinitions[key] = resolveBgBlockForBreakpoint(block, isMobile);
  }
  return {
    sections: sections.map((s) => resolveSectionBlock(s, isMobile)),
    bg: resolvedBg,
    bgDefinitions: resolvedBgDefinitions,
  };
}

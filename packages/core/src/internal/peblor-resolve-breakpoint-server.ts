/**
 * Server-only: resolve responsive [mobile, desktop] and { mobile?, desktop? } values
 * for a single breakpoint so the client receives a pre-resolved tree and can skip
 * useDeviceType / resolution on first paint. JSON keeps full flexibility; we only
 * resolve at request time from User-Agent (or explicit isMobile).
 */

import { BREAKPOINT_TIER_NAMES } from "@pb/contracts/peblor/core/breakpoint-tiers";
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
import { isMobileFromUserAgent } from "../lib/shared-utils";

export { isMobileFromUserAgent };

/** Resolve responsive value that may be scalar, tier map, or container map. */
function resolveForBreakpoint<T>(value: unknown, isMobile: boolean): T | undefined {
  return resolveResponsiveValue(value as T, isMobile);
}

/** True if value is responsive (tier map or @container map). */
function valueNeedsBreakpointResolution(value: unknown): boolean {
  if (value === undefined) return false;
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("@container" in obj) return true;
    for (const tier of BREAKPOINT_TIER_NAMES) {
      if (tier in obj) return true;
    }
  }
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

/** Resolve elements in a section for the given breakpoint. */
function resolveSectionElements(
  elements: ElementBlock[] | undefined,
  isMobile: boolean
): ElementBlock[] {
  return (elements ?? []).map((el) => resolveElementBlock(el, isMobile));
}

type SectionResolver = (block: SectionBlock, isMobile: boolean, base: SectionBlock) => SectionBlock;

const SECTION_RESOLVERS: Record<string, SectionResolver> = {
  sectionColumn: (block, isMobile, base) => {
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
      gridDebug?: boolean | { base?: boolean; md?: boolean };
      gridAutoRows?: string | { base?: string; md?: string };
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
  },

  contentBlock: (block, isMobile, base) => {
    const content = block as SectionBlock & {
      elements?: ElementBlock[];
      contentWidth?: unknown;
      contentHeight?: unknown;
      flow?: unknown;
      align?: unknown;
      distribute?: unknown;
      wrap?: unknown;
      gap?: unknown;
      rowGap?: unknown;
      columnGap?: unknown;
    };
    return {
      ...base,
      type: "contentBlock",
      elements: resolveSectionElements(content.elements, isMobile),
      contentWidth: resolveForBreakpoint(content.contentWidth, isMobile),
      contentHeight: resolveForBreakpoint(content.contentHeight, isMobile),
      flow: resolveForBreakpoint(content.flow, isMobile),
      align: resolveForBreakpoint(content.align, isMobile),
      distribute: resolveForBreakpoint(content.distribute, isMobile),
      wrap: resolveForBreakpoint(content.wrap, isMobile),
      gap: resolveForBreakpoint(content.gap, isMobile),
      rowGap: resolveForBreakpoint(content.rowGap, isMobile),
      columnGap: resolveForBreakpoint(content.columnGap, isMobile),
    } as SectionBlock;
  },

  scrollContainer: (block, isMobile, base) => {
    const scroll = block as SectionBlock & { elements?: ElementBlock[] };
    return {
      ...base,
      type: "scrollContainer",
      elements: resolveSectionElements(scroll.elements, isMobile),
    } as SectionBlock;
  },

  formBlock: (block, isMobile, base) => {
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
  },

  revealSection: (block, isMobile, base) => {
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
  },
};

function resolveSectionBlock(block: SectionBlock, isMobile: boolean): SectionBlock {
  const type = block.type;
  const base = resolveBaseSectionProps(block as Record<string, unknown>, isMobile) as SectionBlock;
  if (
    base === (block as Record<string, unknown>) &&
    (type === "divider" || type === "sectionTrigger" || type === "pageTrigger")
  ) {
    return block;
  }
  const resolver = SECTION_RESOLVERS[type];
  if (resolver) return resolver(block, isMobile, base);
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

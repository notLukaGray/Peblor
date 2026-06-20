import type { CSSProperties } from "react";
import type { ElementBlock, SectionBlock } from "@pb/contracts/types";
import {
  getColumnFlexStyles,
  resolveColumnAssignments,
  resolveColumnWidths,
  resolveColumnStyles,
} from "@pb/core/layout";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import { ServerElementRenderer } from "../ServerElementRenderer";
import { buildServerSectionBaseStyle } from "./server-section-style";
import { resolveResponsiveUnknown } from "@/peblor/utils/resolve-responsive-unknown";
import { globals } from "@pb/runtime-react/core/lib/globals";
import {
  getBoxStyle,
  gridTemplateFromFlexStyles,
} from "../../section/SectionColumnGrid/section-column-grid-utils";
import {
  sanitizeCssProp,
  sanitizeCssValue,
  toKebabCase,
} from "../../elements/Shared/css-declaration-utils";

/** Serialize a React.CSSProperties object into a `prop:value;prop:value` CSS string. */
function styleObjectToCssDeclarations(style: CSSProperties | undefined): string {
  if (!style) return "";
  const decls: string[] = [];
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || value === null || value === "") continue;
    const prop = sanitizeCssProp(toKebabCase(key));
    if (!prop) continue;
    const val = sanitizeCssValue(value as string | number);
    if (!val) continue;
    decls.push(`${prop}:${val}!important`);
  }
  return decls.join(";");
}

type Props = Extract<SectionBlock, { type: "sectionColumn" }> & { serverIsMobile?: boolean };

function elementId(element: ElementBlock, index: number): string {
  const id = (element as ElementBlock & { id?: string }).id;
  return typeof id === "string" && id.length > 0 ? id : `element-${index}`;
}

/** CSS grid-template-columns for a given breakpoint. isMobile=true → mobile value. */
function computeGridTemplate(columns: unknown, columnWidths: unknown, isMobile: boolean): string {
  const colCountRaw = resolveResponsiveUnknown(columns, isMobile);
  const colCount = typeof colCountRaw === "number" ? colCountRaw : 1;
  const widths = resolveColumnWidths(
    columnWidths as Parameters<typeof resolveColumnWidths>[0],
    !isMobile
  );
  const flexStyles = widths
    ? getColumnFlexStyles(widths as Parameters<typeof getColumnFlexStyles>[0], colCount)
    : null;
  return flexStyles
    ? gridTemplateFromFlexStyles(flexStyles, { forCssGrid: true })
    : `repeat(${colCount}, minmax(0, 1fr))`;
}

/**
 * Responsive CSS for a static column section.
 *
 * Always emits the mobile grid-template-columns as the base rule; adds a
 * @media override when the desktop value differs. When colIndices is provided,
 * desktop-only explicit grid-column placement is added via [data-pb-col] selectors
 * (mobile auto-places naturally in the narrower grid — no !important needed since
 * grid-column is NOT set inline in the static render path).
 *
 * `bucketPlacements` handles the grouped-rendering path, where DOM elements are
 * nested inside per-*mobile*-column "bucket" divs (for reading order on narrow
 * viewports). A mobile column whose items all share one desktop column is a single
 * bucket repositioned as a whole. A mobile column whose items fan out to different
 * desktop columns (e.g. a label + a body sharing one mobile column but two desktop
 * columns) renders as multiple sibling buckets — each one repositioned (and
 * re-styled with its own desktop columnStyles box) independently.
 */
function buildResponsiveColumnCss(
  sectionId: string,
  mobileTpl: string,
  desktopTpl: string,
  bpPx: number,
  colIndices?: number[],
  bucketPlacements?: Array<{ bucketKey: string; desktopCol: number; boxCss: string }>
): string {
  const gridSel = `#${sectionId}>[data-pb-grid]`;
  let css = `${gridSel}{grid-template-columns:${mobileTpl}}`;
  if (mobileTpl !== desktopTpl) {
    css += `@media(min-width:${bpPx}px){${gridSel}{grid-template-columns:${desktopTpl}}}`;
  }

  const rules: string[] = [];
  if (bucketPlacements) {
    for (const { bucketKey, desktopCol, boxCss } of bucketPlacements) {
      const decls = [`grid-column:${desktopCol + 1}!important`, boxCss].filter(Boolean).join(";");
      rules.push(`${gridSel}>[data-pb-bucket="${bucketKey}"]{${decls}}`);
    }
  } else if (colIndices && colIndices.length > 1) {
    for (const ci of colIndices) {
      rules.push(`${gridSel}>[data-pb-col="${ci}"]{grid-column:${ci + 1}}`);
    }
  }

  if (rules.length > 0) {
    css += `@media(min-width:${bpPx}px){${rules.join("")}}`;
  }
  return css;
}

export function ServerSectionColumn({
  id,
  ariaLabel,
  elements = [],
  columns,
  columnAssignments,
  columnGaps,
  columnWidths,
  columnStyles,
  elementOrder,
  gridAutoRows,
  gridAutoColumns,
  gridAutoFlow,
  gridTemplateAreas,
  serverIsMobile,
  colorScheme,
  ...section
}: Props) {
  const isMobile = serverIsMobile ?? false;
  const isDesktop = !isMobile;

  const resolvedAriaLabel =
    resolveResponsiveValue(ariaLabel, isMobile) ?? id ?? globals.stringsAriaLabelColumnLayout;
  const { style } = buildServerSectionBaseStyle(section, serverIsMobile);

  const resolvedColumnsRaw = resolveResponsiveUnknown(columns, isMobile);
  const resolvedColumns = typeof resolvedColumnsRaw === "number" ? resolvedColumnsRaw : 1;

  const resolvedColumnGapRaw = resolveResponsiveUnknown(columnGaps, isMobile);
  const resolvedColumnGap =
    typeof resolvedColumnGapRaw === "string" || typeof resolvedColumnGapRaw === "number"
      ? resolvedColumnGapRaw
      : "1rem";

  const order = resolveResponsiveUnknown(elementOrder, isMobile);
  const elementById = new Map(
    elements.map((element, index) => [elementId(element, index), element])
  );
  const orderedElements = Array.isArray(order)
    ? order
        .map((key) => elementById.get(key))
        .filter((element): element is ElementBlock => !!element)
    : elements;

  const resolvedGridAutoRows = resolveResponsiveUnknown(gridAutoRows, isMobile);
  const resolvedGridAutoColumns = resolveResponsiveUnknown(gridAutoColumns, isMobile);
  const resolvedGridAutoFlow = resolveResponsiveUnknown(gridAutoFlow, isMobile);
  const resolvedGridTemplateAreas = resolveResponsiveUnknown(gridTemplateAreas, isMobile);

  // Column config resolved for the desktop breakpoint (drives CSS grid-column placement).
  const resolvedColumnStyles = resolveColumnStyles(
    columnStyles as unknown as Parameters<typeof resolveColumnStyles>[0],
    isDesktop
  );
  const desktopColumnAssignments = resolveColumnAssignments(
    columnAssignments as unknown as Parameters<typeof resolveColumnAssignments>[0],
    isDesktop
  );
  // Column assignments resolved for mobile (drives DOM grouping order).
  const mobileColumnAssignments = resolveColumnAssignments(
    columnAssignments as unknown as Parameters<typeof resolveColumnAssignments>[0],
    false
  );

  // Compute grid-template-columns for both breakpoints.
  const mobileTpl = computeGridTemplate(columns, columnWidths, true);
  const desktopTpl = computeGridTemplate(columns, columnWidths, false);
  const bpPx = globals.uiBreakpointDesktopPx;

  // When id is available: gridTemplateColumns comes from responsive CSS (not inline).
  // Without id (rare): bake desktop value inline as a fallback.
  const useResponsiveCss = id != null;

  const gridStyle: CSSProperties = {
    position: "relative",
    zIndex: globals.zIndexColumnGrid,
    display: "grid",
    ...(useResponsiveCss ? {} : { gridTemplateColumns: desktopTpl }),
    gap: resolvedColumnGap,
    width: "100%",
    ...(typeof resolvedGridAutoRows === "string" ? { gridAutoRows: resolvedGridAutoRows } : {}),
    ...(typeof resolvedGridAutoColumns === "string"
      ? { gridAutoColumns: resolvedGridAutoColumns }
      : {}),
    ...(typeof resolvedGridAutoFlow === "string" ? { gridAutoFlow: resolvedGridAutoFlow } : {}),
    ...(typeof resolvedGridTemplateAreas === "string"
      ? { gridTemplateAreas: resolvedGridTemplateAreas }
      : {}),
  };

  const hasColumnAssignments = Object.keys(mobileColumnAssignments).length > 0;

  // Grouped column rendering: columnStyles or explicit assignments present.
  // Each column becomes a flex container; gridColumn is CSS-only (no inline), so
  // mobile auto-places naturally in the narrower grid.
  if (resolvedColumnStyles != null || hasColumnAssignments) {
    // Group elements by mobile column assignment for correct DOM reading order.
    const columnsMap = new Map<number, { key: string; element: ElementBlock }[]>();
    for (let i = 0; i < resolvedColumns; i++) columnsMap.set(i, []);
    for (let i = 0; i < orderedElements.length; i++) {
      const element = orderedElements[i]!;
      const elId = elementId(element, i);
      const rawCol = mobileColumnAssignments[elId] ?? i % resolvedColumns;
      const col = Math.max(0, Math.min(resolvedColumns - 1, rawCol));
      columnsMap.get(col)!.push({ key: elId, element });
    }

    // Drop mobile-column slots nothing was assigned to (resolvedColumns pre-populates
    // every slot above) — an empty slot would still render its columnStyles box (border/
    // padding) as a phantom div with nothing in it.
    const sortedCols = Array.from(columnsMap.entries())
      .filter(([, items]) => items.length > 0)
      .sort(([a], [b]) => a - b);
    const colIndices = sortedCols.map(([ci]) => ci);

    // Each mobile-grouped column may fan out to more than one desktop column (e.g. a
    // label + a body sharing one mobile column but two desktop columns). Split it into
    // one "bucket" div per target desktop column instead of one div per mobile column,
    // so each bucket can be grid-placed at its real desktop column AND keep its own
    // desktop columnStyles box (border/padding/gap) — a single shared wrapper can't
    // carry two different boxes once its contents visually separate.
    type BucketItem = { key: string; element: ElementBlock };
    type Bucket = {
      bucketKey: string;
      mobileCol: number;
      bucketIndexInMobileCol: number;
      desktopCol: number;
      items: BucketItem[];
    };
    const buckets: Bucket[] = [];
    for (const [mobileCol, items] of sortedCols) {
      const targets = items.map(({ key }) => desktopColumnAssignments[key] ?? mobileCol);
      const uniqueTargets = Array.from(new Set(targets));
      if (uniqueTargets.length <= 1) {
        buckets.push({
          bucketKey: `${mobileCol}-0`,
          mobileCol,
          bucketIndexInMobileCol: 0,
          desktopCol: uniqueTargets[0] ?? mobileCol,
          items,
        });
        continue;
      }
      const byTarget = new Map<number, BucketItem[]>();
      targets.forEach((target, idx) => {
        const bucketItems = byTarget.get(target) ?? [];
        bucketItems.push(items[idx]!);
        byTarget.set(target, bucketItems);
      });
      Array.from(byTarget.entries()).forEach(
        ([desktopCol, bucketItems], bucketIndexInMobileCol) => {
          buckets.push({
            bucketKey: `${mobileCol}-${bucketIndexInMobileCol}`,
            mobileCol,
            bucketIndexInMobileCol,
            desktopCol,
            items: bucketItems,
          });
        }
      );
    }

    const bucketPlacements = buckets.map(({ bucketKey, desktopCol }) => ({
      bucketKey,
      desktopCol,
      boxCss: styleObjectToCssDeclarations(getBoxStyle(resolvedColumnStyles?.[desktopCol])),
    }));

    const responsiveCss = useResponsiveCss
      ? buildResponsiveColumnCss(
          id!,
          mobileTpl,
          desktopTpl,
          bpPx,
          colIndices,
          buckets.length > 1 ? bucketPlacements : undefined
        )
      : null;

    return (
      <section
        id={id}
        className="relative z-[var(--pb-z-raised)] flex shrink-0 flex-col min-h-0"
        style={style}
        aria-label={resolvedAriaLabel}
        data-section-type="sectionColumn"
        data-color-scheme={colorScheme ?? undefined}
      >
        {responsiveCss && (
          <style href={`pb-col-${id}`} precedence="low">
            {responsiveCss}
          </style>
        )}
        <div style={gridStyle} data-pb-grid="">
          {buckets.map(({ bucketKey, bucketIndexInMobileCol, desktopCol, items }) => {
            // Mobile (no @media override yet): only the first bucket of a mobile column
            // shows the box (border/padding/gap) — a column that splits on desktop is
            // still one flowing block on mobile, so its divider shouldn't repeat.
            const cs =
              bucketIndexInMobileCol === 0 ? resolvedColumnStyles?.[desktopCol] : undefined;
            return (
              <div
                key={`bucket-${bucketKey}`}
                className="min-w-0 flex flex-col"
                // data-pb-bucket drives gridColumn + the desktop columnStyles box via CSS
                data-pb-bucket={buckets.length > 1 ? bucketKey : undefined}
                style={getBoxStyle(cs)}
              >
                {items.map(({ key, element }) => (
                  <ServerElementRenderer
                    key={key}
                    block={element}
                    serverIsMobile={serverIsMobile}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // Simple rendering: each element as its own grid cell.
  // Collect assigned column indices for CSS gridColumn emission.
  const assignedColIndices = Array.from(
    new Set(
      orderedElements
        .map((el, i) => desktopColumnAssignments[elementId(el, i)])
        .filter((v): v is number => v != null)
    )
  );
  const simpleResponsiveCss = useResponsiveCss
    ? buildResponsiveColumnCss(id!, mobileTpl, desktopTpl, bpPx, assignedColIndices)
    : null;

  return (
    <section
      id={id}
      className="relative z-[var(--pb-z-raised)] flex shrink-0 flex-col min-h-0"
      style={style}
      aria-label={resolvedAriaLabel}
      data-section-type="sectionColumn"
      data-color-scheme={colorScheme ?? undefined}
    >
      {simpleResponsiveCss && (
        <style href={`pb-col-${id}`} precedence="low">
          {simpleResponsiveCss}
        </style>
      )}
      <div style={gridStyle} data-pb-grid="">
        {orderedElements.map((element, index) => {
          const elId = elementId(element, index);
          const assignedColumn = desktopColumnAssignments[elId];
          return (
            <div
              key={elId}
              // data-pb-col drives gridColumn via CSS (desktop only); no inline gridColumn
              data-pb-col={assignedColumn != null ? assignedColumn : undefined}
            >
              <ServerElementRenderer block={element} serverIsMobile={serverIsMobile} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

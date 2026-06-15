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
 */
function buildResponsiveColumnCss(
  sectionId: string,
  mobileTpl: string,
  desktopTpl: string,
  bpPx: number,
  colIndices?: number[]
): string {
  const gridSel = `#${sectionId}>[data-pb-grid]`;
  let css = `${gridSel}{grid-template-columns:${mobileTpl}}`;
  if (mobileTpl !== desktopTpl) {
    css += `@media(min-width:${bpPx}px){${gridSel}{grid-template-columns:${desktopTpl}}}`;
  }
  if (colIndices && colIndices.length > 1) {
    const colRules = colIndices
      .map((ci) => `${gridSel}>[data-pb-col="${ci}"]{grid-column:${ci + 1}}`)
      .join("");
    css += `@media(min-width:${bpPx}px){${colRules}}`;
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

    const sortedCols = Array.from(columnsMap.entries()).sort(([a], [b]) => a - b);
    const colIndices = sortedCols.map(([ci]) => ci);
    const responsiveCss = useResponsiveCss
      ? buildResponsiveColumnCss(id!, mobileTpl, desktopTpl, bpPx, colIndices)
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
          {sortedCols.map(([colIndex, items]) => {
            const cs = resolvedColumnStyles?.[colIndex];
            return (
              <div
                key={`col-${colIndex}`}
                className="min-w-0 flex flex-col"
                // data-pb-col drives gridColumn via CSS (desktop only); mobile auto-places
                data-pb-col={colIndices.length > 1 ? colIndex : undefined}
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

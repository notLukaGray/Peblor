import type { CSSProperties } from "react";
import type { ElementBlock, SectionBlock } from "@pb/contracts/types";
import { resolveResponsiveValue } from "@pb/runtime-react/core/lib/responsive-value";
import { ServerElementRenderer } from "../ServerElementRenderer";
import { buildServerSectionBaseStyle } from "./server-section-style";

type Props = Extract<SectionBlock, { type: "sectionColumn" }> & { serverIsMobile?: boolean };

function elementId(element: ElementBlock, index: number): string {
  const id = (element as ElementBlock & { id?: string }).id;
  return typeof id === "string" && id.length > 0 ? id : `element-${index}`;
}

function resolveResponsiveUnknown(value: unknown, isMobile: boolean): unknown {
  if (Array.isArray(value)) return value[isMobile ? 0 : 1] ?? value[0];
  if (value != null && typeof value === "object") {
    const record = value as { mobile?: unknown; desktop?: unknown };
    if ("mobile" in record || "desktop" in record) {
      return isMobile ? (record.mobile ?? record.desktop) : (record.desktop ?? record.mobile);
    }
  }
  return value;
}

export function ServerSectionColumn({
  id,
  ariaLabel,
  elements = [],
  columns,
  columnAssignments,
  columnGaps,
  elementOrder,
  serverIsMobile,
  ...section
}: Props) {
  const isMobile = serverIsMobile ?? false;
  const resolvedAriaLabel = resolveResponsiveValue(ariaLabel, isMobile) ?? id ?? "Column layout";
  const { style } = buildServerSectionBaseStyle(section, serverIsMobile, true);
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
  const gridStyle: CSSProperties = {
    position: "relative",
    zIndex: 10,
    display: "grid",
    gridTemplateColumns: `repeat(${resolvedColumns}, minmax(0, 1fr))`,
    gap: resolvedColumnGap,
    width: "100%",
  };

  return (
    <section
      className="relative z-[var(--pb-z-raised)] flex shrink-0 flex-col min-h-0"
      style={style}
      aria-label={resolvedAriaLabel}
      data-section-type="sectionColumn"
    >
      <div style={gridStyle}>
        {orderedElements.map((element, index) => {
          const id = elementId(element, index);
          const assignedColumn = (columnAssignments as Record<string, number> | undefined)?.[id];
          return (
            <div key={id} style={assignedColumn ? { gridColumn: assignedColumn } : undefined}>
              <ServerElementRenderer block={element} serverIsMobile={serverIsMobile} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

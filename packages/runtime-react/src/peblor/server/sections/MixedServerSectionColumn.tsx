/**
 * Mixed server/client section column.
 *
 * Renders the element list on the server (SSR) via ServerElementRenderer, and
 * delegates all layout/grid/sticky/fixed/motion to the client island
 * (ClientMixedSectionColumnShell → MixedSectionColumnIsland).
 *
 * Elements are grouped by their assigned column into flex-column containers so
 * that all elements in a column stack vertically within a single grid cell.
 *
 * Layout responsibilities:
 *   - Server: element ordering, column grouping, columnAssignments
 *   - Client (MixedSectionColumnIsland): CSS grid (columnWidths), gap, fill,
 *     layers, sticky, fixed, glass effect, entrance motion, viewport triggers
 */

import type { ElementBlock, SectionBlock } from "@pb/contracts/types";
import { ClientMixedSectionColumnShell } from "../../client-islands/ClientMixedSectionColumnShell";
import { ServerElementRenderer } from "../ServerElementRenderer";
import { resolveResponsiveUnknown } from "@/peblor/utils/resolve-responsive-unknown";

type SectionColumnProps = Extract<SectionBlock, { type: "sectionColumn" }> & {
  serverIsMobile?: boolean;
  hydrationPriority?: "critical" | "approaching" | "idle";
};

function elementId(element: ElementBlock, index: number): string {
  const id = (element as ElementBlock & { id?: string }).id;
  return typeof id === "string" && id.length > 0 ? id : `element-${index}`;
}

export function MixedServerSectionColumn({
  elements = [],
  elementOrder,
  serverIsMobile,
  hydrationPriority,
  ...rest
}: SectionColumnProps) {
  const isMobile = serverIsMobile ?? false;
  const order = resolveResponsiveUnknown(elementOrder, isMobile);
  const elementById = new Map(
    elements.map((element, index) => [elementId(element, index), element])
  );
  const orderedElements = Array.isArray(order)
    ? order.map((key) => elementById.get(key)).filter((el): el is ElementBlock => !!el)
    : elements;

  const columnAssignments = rest.columnAssignments as Record<string, number> | undefined;

  if (!columnAssignments) {
    return (
      <ClientMixedSectionColumnShell {...rest} hydrationPriority={hydrationPriority}>
        {orderedElements.map((element, index) => {
          const id = elementId(element, index);
          return (
            <div key={id} className="min-w-0">
              <ServerElementRenderer block={element} serverIsMobile={serverIsMobile} />
            </div>
          );
        })}
      </ClientMixedSectionColumnShell>
    );
  }

  const columnsMap = new Map<number, { key: string; element: ElementBlock }[]>();
  for (let i = 0; i < orderedElements.length; i++) {
    const element = orderedElements[i]!;
    const id = elementId(element, i);
    const col = columnAssignments[id] ?? 0;
    if (!columnsMap.has(col)) columnsMap.set(col, []);
    columnsMap.get(col)!.push({ key: id, element });
  }

  const columns = Array.from(columnsMap.entries()).sort(([a], [b]) => a - b);

  return (
    <ClientMixedSectionColumnShell {...rest} hydrationPriority={hydrationPriority}>
      {columns.map(([colIndex, items]) => (
        <div
          key={`col-${colIndex}`}
          className="min-w-0"
          // gridColumn inline for gap-safe desktop placement; data-pb-col lets the shell's
          // CSS reset it on mobile so the narrower grid doesn't grow implicit columns.
          data-pb-col={colIndex}
          style={{ gridColumn: colIndex + 1, display: "flex", flexDirection: "column" }}
        >
          {items.map(({ key, element }) => (
            <div key={key} className="min-w-0">
              <ServerElementRenderer block={element} serverIsMobile={serverIsMobile} />
            </div>
          ))}
        </div>
      ))}
    </ClientMixedSectionColumnShell>
  );
}

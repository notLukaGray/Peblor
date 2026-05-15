import type { ElementBlock, SectionBlock } from "@pb/contracts/types";
import { ClientMixedSectionColumnShell } from "../../client-islands/ClientMixedSectionColumnShell";
import { ServerElementRenderer } from "../ServerElementRenderer";

type SectionColumnProps = Extract<SectionBlock, { type: "sectionColumn" }> & {
  serverIsMobile?: boolean;
};

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

function elementId(element: ElementBlock, index: number): string {
  const id = (element as ElementBlock & { id?: string }).id;
  return typeof id === "string" && id.length > 0 ? id : `element-${index}`;
}

export function MixedServerSectionColumn({
  elements = [],
  elementOrder,
  serverIsMobile,
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

  return (
    <ClientMixedSectionColumnShell {...rest}>
      {orderedElements.map((element, index) => {
        const id = elementId(element, index);
        const assignedColumn = columnAssignments?.[id];
        return (
          <div key={id} style={assignedColumn ? { gridColumn: assignedColumn } : undefined}>
            <ServerElementRenderer block={element} serverIsMobile={serverIsMobile} />
          </div>
        );
      })}
    </ClientMixedSectionColumnShell>
  );
}

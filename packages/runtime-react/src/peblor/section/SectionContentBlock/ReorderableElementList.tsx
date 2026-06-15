"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  ElementBlock,
  SectionDefinitionBlock,
} from "@pb/contracts/peblor/core/peblor-schemas";
import { generateElementKey } from "@pb/core/keys";
import { ElementErrorBoundary } from "@/peblor/SectionErrorBoundary";
import { ElementRenderer } from "@/peblor/elements/Shared/ElementRenderer";
import { ReorderGroup, ReorderItem } from "@/peblor/integrations/framer-motion";
import { SectionDefinitionsContext } from "@/peblor/elements/ElementModule/ModuleSlotContext";

type Props = {
  elements: ElementBlock[];
  sectionDefinitions?: Record<string, SectionDefinitionBlock>;
  /** "y" (default) or "x" for reorder axis */
  axis?: "x" | "y";
  /** Default draggable unit: "frame" (outer layout container) or "content". Frame is the default so the whole card/row is dragged. */
  dragUnit?: "frame" | "content";
  /** Default drag behavior: "elasticSnap" (elastic + snap to slot), "free", or "none". */
  dragBehavior?: "elasticSnap" | "free" | "none" | "swap";
  /** Called when order changes so the parent can persist (e.g. to elementOrder / form). */
  onOrderChange?: (order: string[]) => void;
  /** Override flexDirection for the Reorder.Group container. Defaults to column for axis=y, row for axis=x. */
  flexDirection?: React.CSSProperties["flexDirection"];
  /** Enable flexWrap on the Reorder.Group container. Use with a row direction + fixed-width items for wrapping grids. */
  flexWrap?: React.CSSProperties["flexWrap"];
  /** justifyContent for the Reorder.Group container. Use "center" to center incomplete rows in wrapping grids. */
  justifyContent?: React.CSSProperties["justifyContent"];
  /** Gap between items in the Reorder.Group container. */
  gap?: React.CSSProperties["gap"];
};

/** Frame wrapper for each reorder item. Width: 100% so items fill the reorder column. */
const reorderItemFrameStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  minHeight: 0,
};

function resolveItemFrameStyle(
  flexDirection: React.CSSProperties["flexDirection"] | undefined,
  flexWrap: React.CSSProperties["flexWrap"] | undefined
): React.CSSProperties {
  // Wrapping row layout: items need their natural widths so they flow into columns.
  if (flexDirection === "row" && (flexWrap === "wrap" || flexWrap === "wrap-reverse")) {
    return { position: "relative", minHeight: 0 };
  }
  return reorderItemFrameStyle;
}

/** Renders a list of elements as Framer Motion Reorder.Group/Item. Default draggable unit is the frame (outer container). */
export function ReorderableElementList({
  elements,
  sectionDefinitions,
  axis = "y",
  dragUnit = "frame",
  dragBehavior = "elasticSnap",
  onOrderChange,
  flexDirection: flexDirectionProp,
  flexWrap,
  justifyContent,
  gap,
}: Props) {
  const initialOrder = useMemo(
    () => elements.map((block, i) => generateElementKey(block, i)),
    [elements]
  );
  const [orderState, setOrderState] = useState<{ source: string[]; order: string[] }>(() => ({
    source: initialOrder,
    order: initialOrder,
  }));
  const order = orderState.source === initialOrder ? orderState.order : initialOrder;

  const activeOrder = useMemo(() => {
    if (order.length !== initialOrder.length) return initialOrder;
    const known = new Set(initialOrder);
    for (const key of order) {
      if (!known.has(key)) return initialOrder;
    }
    return order;
  }, [initialOrder, order]);

  const handleReorder = useCallback(
    (newOrder: string[]) => {
      setOrderState({ source: initialOrder, order: newOrder });
      onOrderChange?.(newOrder);
    },
    [initialOrder, onOrderChange]
  );

  const keyToBlock = useMemo(() => {
    const map: Record<string, ElementBlock> = {};
    elements.forEach((el, i) => {
      const key = generateElementKey(el, i);
      map[key] = el;
    });
    return map;
  }, [elements]);

  const { dragEnabled } = useMemo(() => {
    if (dragBehavior === "none") return { dragEnabled: false };
    if (dragBehavior === "elasticSnap") {
      return {
        dragEnabled: true,
      };
    }
    return { dragEnabled: true };
  }, [dragBehavior]);

  const effectiveFlexDirection = flexDirectionProp ?? (axis === "y" ? "column" : "row");
  const itemFrameStyle = useMemo(
    () => resolveItemFrameStyle(effectiveFlexDirection, flexWrap),
    [effectiveFlexDirection, flexWrap]
  );

  const groupStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: effectiveFlexDirection,
    flexWrap: flexWrap ?? "nowrap",
    justifyContent,
    gap: gap ?? 0,
    listStyle: "none",
    margin: 0,
    padding: 0,
    ...(flexDirectionProp == null && axis === "y" ? { alignItems: "center" } : {}),
  };

  return (
    <SectionDefinitionsContext.Provider value={sectionDefinitions ?? null}>
      <ReorderGroup axis={axis} values={activeOrder} onReorder={handleReorder} style={groupStyle}>
        {activeOrder.map((key) => {
          const block = keyToBlock[key];
          if (!block) return null;
          const content = (
            <ElementErrorBoundary elementKey={key}>
              <ElementRenderer block={block} />
            </ElementErrorBoundary>
          );
          return (
            <ReorderItem
              key={key}
              value={key}
              style={itemFrameStyle}
              drag={dragEnabled}
              dragBehavior={dragBehavior}
            >
              {dragUnit === "frame" ? <div style={itemFrameStyle}>{content}</div> : content}
            </ReorderItem>
          );
        })}
      </ReorderGroup>
    </SectionDefinitionsContext.Provider>
  );
}

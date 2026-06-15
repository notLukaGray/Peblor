"use client";

import type { UseColumnLayoutResult } from "@/peblor/hooks/use-column-layout";
import type { ElementBlock } from "@pb/contracts/types";
import { SectionColumnGrid } from "../SectionColumnGrid";

type SectionColumnContentProps = {
  elements: ElementBlock[];
  columnLayout: UseColumnLayoutResult<ElementBlock>;
  gridDebug: boolean | undefined;
  gridAutoRows: string | undefined;
  gridAutoColumns: string | undefined;
  gridAutoFlow: string | undefined;
  gridTemplateAreas: string | undefined;
};

export function SectionColumnContent({
  elements,
  columnLayout,
  gridDebug,
  gridAutoRows,
  gridAutoColumns,
  gridAutoFlow,
  gridTemplateAreas,
}: SectionColumnContentProps) {
  if (elements.length === 0) {
    return (
      <div className="relative z-[var(--pb-z-raised)] p-4 text-red-500">
        No elements found in column layout section
      </div>
    );
  }

  return (
    <SectionColumnGrid
      elementsByColumn={columnLayout.elementsByColumn}
      columnFlexStyles={columnLayout.columnFlexStyles}
      resolvedColumnCount={columnLayout.resolvedColumnCount}
      resolvedColumnGaps={columnLayout.resolvedColumnGaps}
      columnStyles={columnLayout.resolvedColumnStyles}
      itemStyles={columnLayout.resolvedItemStyles}
      gridMode={columnLayout.resolvedGridMode}
      gridDebug={gridDebug}
      gridAutoRows={gridAutoRows}
      gridAutoColumns={gridAutoColumns}
      gridAutoFlow={gridAutoFlow}
      gridTemplateAreas={gridTemplateAreas}
      gridLayoutItems={columnLayout.gridLayoutItems}
      itemLayout={columnLayout.resolvedItemLayout}
      layoutSegments={columnLayout.layoutSegments}
      contentWrapperStyle={columnLayout.contentWrapperStyle}
    />
  );
}

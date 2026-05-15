"use client";

import { useEffect } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import type { JsonValue } from "@pb/contracts/types";
import { setVariable } from "@/peblor/runtime/peblor-variable-store";

function getBlockId(block: ElementBlock | undefined): string | undefined {
  if (!block) return undefined;
  return typeof (block as { id?: unknown }).id === "string"
    ? ((block as { id?: string }).id as string)
    : undefined;
}

type SelectionPublishOptions = {
  activeBaseIndex: number;
  blocks: ElementBlock[];
  isMoving: boolean;
  itemCount: number;
  selectedIdVariable?: string;
  selectedIndexVariable?: string;
  selectedValueVariable?: string;
  selectedValues?: Record<string, JsonValue>;
};

export function useInfiniteScrollSelectionPublish({
  activeBaseIndex,
  blocks,
  isMoving,
  itemCount,
  selectedIdVariable,
  selectedIndexVariable,
  selectedValueVariable,
  selectedValues,
}: SelectionPublishOptions): void {
  useEffect(() => {
    if (itemCount === 0 || isMoving) return;

    const activeBlock = blocks[activeBaseIndex];
    if (!activeBlock) return;

    const activeId = getBlockId(activeBlock);
    const selectedValue: JsonValue =
      selectedValues && activeId && activeId in selectedValues
        ? (selectedValues[activeId] as JsonValue)
        : ((activeId ?? activeBaseIndex) as JsonValue);

    if (selectedIndexVariable) setVariable(selectedIndexVariable, activeBaseIndex);
    if (selectedIdVariable && activeId) setVariable(selectedIdVariable, activeId);
    if (selectedValueVariable) setVariable(selectedValueVariable, selectedValue);
  }, [
    activeBaseIndex,
    blocks,
    isMoving,
    itemCount,
    selectedIdVariable,
    selectedIndexVariable,
    selectedValueVariable,
    selectedValues,
  ]);
}

"use client";

import { useMemo } from "react";
import type {
  ElementBlock,
  SectionDefinitionBlock,
} from "@pb/contracts/peblor/core/peblor-schemas";
import type { JsonValue } from "@pb/contracts/types";
import { reconcileElementOrderWithDefinitions } from "@pb/core/modules";
import { generateElementKey } from "@pb/core/keys";
import { LOOP_COPY_COUNT, clampIndex, shouldLoopInfiniteScroll } from "./infinite-scroll-math";
import type {
  InfiniteScrollBlocksResult,
  InfiniteScrollProps,
  InfiniteScrollRenderedItem,
} from "./infinite-scroll-types";

function getBlockId(block: ElementBlock | undefined): string | undefined {
  if (!block) return undefined;
  return typeof (block as { id?: unknown }).id === "string"
    ? ((block as { id?: string }).id as string)
    : undefined;
}

export function useInfiniteScrollBlocks(
  section: InfiniteScrollProps["section"],
  resolveShowWhen: ((showWhen: string | undefined) => boolean) | undefined,
  selectedValues: InfiniteScrollProps["selectedValues"],
  initialIndex: number,
  loop: boolean
): InfiniteScrollBlocksResult {
  const definitions = useMemo(
    () => (section?.definitions as Record<string, SectionDefinitionBlock>) ?? {},
    [section?.definitions]
  );
  const order = useMemo(
    () => reconcileElementOrderWithDefinitions(section?.elementOrder, definitions),
    [section?.elementOrder, definitions]
  );

  const rawBlocks = useMemo(() => {
    const idCounts = new Map<string, number>();
    return order
      .map((key): ElementBlock | null => {
        const candidate = definitions[key] as unknown;
        if (
          !candidate ||
          typeof candidate !== "object" ||
          !("type" in candidate) ||
          (candidate as { type?: string }).type === "cssGradient"
        ) {
          return null;
        }

        const block = candidate as ElementBlock & { id?: unknown };
        const baseId = typeof block.id === "string" && block.id.trim().length > 0 ? block.id : key;
        const nextCount = (idCounts.get(baseId) ?? 0) + 1;
        idCounts.set(baseId, nextCount);
        const uniqueId = nextCount === 1 ? baseId : `${baseId}__${nextCount}`;
        return { ...block, id: uniqueId } as ElementBlock;
      })
      .filter((block): block is ElementBlock => block != null);
  }, [definitions, order]);

  const showWhenResults = useMemo(
    () =>
      rawBlocks.map((block) =>
        resolveShowWhen
          ? resolveShowWhen((block as ElementBlock & { showWhen?: string }).showWhen)
          : true
      ),
    [rawBlocks, resolveShowWhen]
  );

  const blocks = useMemo(
    () => rawBlocks.filter((_, index) => showWhenResults[index]),
    [rawBlocks, showWhenResults]
  );

  const itemCount = blocks.length;

  const selectableBaseIndices = useMemo(() => {
    if (itemCount === 0) return [];
    const selectableKeys =
      selectedValues == null
        ? null
        : new Set(Object.keys(selectedValues as Record<string, JsonValue>));

    return blocks.flatMap((block, baseIndex) => {
      if (selectableKeys == null || selectableKeys.size === 0) return [baseIndex];
      const blockId = getBlockId(block);
      return blockId && selectableKeys.has(blockId) ? [baseIndex] : [];
    });
  }, [blocks, itemCount, selectedValues]);

  const selectableBaseIndexSet = useMemo(
    () => new Set(selectableBaseIndices),
    [selectableBaseIndices]
  );

  const fallbackSelectableBaseIndex =
    selectableBaseIndices[0] ?? (itemCount > 0 ? clampIndex(initialIndex, itemCount) : 0);
  const normalizedInitialIndex =
    itemCount > 0
      ? selectableBaseIndices.includes(initialIndex)
        ? initialIndex
        : fallbackSelectableBaseIndex
      : 0;

  /** Must match `effectiveLoop` in `ElementInfiniteScroll` — raw `loop` alone is not enough. */
  const eligibleForLooping =
    itemCount > 0 && shouldLoopInfiniteScroll(loop, selectableBaseIndices.length);

  const renderCopies = eligibleForLooping ? LOOP_COPY_COUNT : 1;

  const renderedItems = useMemo<InfiniteScrollRenderedItem[]>(
    () =>
      Array.from({ length: renderCopies }, (_, copyIndex) =>
        blocks.map((block, baseIndex) => ({
          baseIndex,
          renderedIndex: copyIndex * itemCount + baseIndex,
          block,
          renderKey: `${copyIndex}-${generateElementKey(block, baseIndex)}`,
        }))
      ).flat(),
    [blocks, itemCount, renderCopies]
  );

  const initialRenderedIndex =
    itemCount > 0 && eligibleForLooping
      ? itemCount + normalizedInitialIndex
      : normalizedInitialIndex;

  const selectableRenderedIndices = useMemo(
    () =>
      renderedItems
        .filter(({ baseIndex }) => selectableBaseIndexSet.has(baseIndex))
        .map(({ renderedIndex }) => renderedIndex),
    [renderedItems, selectableBaseIndexSet]
  );

  return {
    blocks,
    definitions,
    fallbackSelectableBaseIndex,
    initialRenderedIndex,
    itemCount,
    normalizedInitialIndex,
    renderedItems,
    selectableBaseIndexSet,
    selectableBaseIndices,
    selectableRenderedIndices,
  };
}

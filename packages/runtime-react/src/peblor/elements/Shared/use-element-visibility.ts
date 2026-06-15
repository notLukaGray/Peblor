"use client";

import type { ElementBlock } from "@pb/contracts/peblor/core/peblor-schemas";
import {
  evaluateConditions,
  type VisibleWhenConfig,
} from "@pb/contracts/peblor/core/peblor-condition-evaluator";
import type { JsonValue } from "@pb/contracts/types";
import { useElementVisibilityListener } from "@/peblor/hooks/use-element-visibility-listener";

type UseElementVisibilityResult = {
  /**
   * Whether the element is visible. Combines two orthogonal systems:
   * 1. `visibleWhen` — a condition evaluated against the variable store (Zustand)
   * 2. `useElementVisibilityListener` — DOM custom-event-driven visibility (peblor-element-visibility)
   *
   * Returns false if either system says the element should be hidden.
   */
  isVisible: boolean;
};

/**
 * Evaluates an element's visibility based on two independent systems:
 *
 * 1. **visibleWhen** — a condition tree evaluated against the current variable store values.
 *    When no `visibleWhen` config is present, this check passes.
 *
 * 2. **DOM visibility listener** — subscribes to `peblor-element-visibility` custom events
 *    dispatched on the element's `id`. Elements without an `id` are always visible under this check.
 *
 * Both must pass for the element to be visible.
 */
export function useElementVisibility(
  resolvedBlock: ElementBlock,
  variables: Record<string, JsonValue>
): UseElementVisibilityResult {
  const blockId = (resolvedBlock as ElementBlock & { id?: string }).id;
  const visibleWhen = (resolvedBlock as ElementBlock & { visibleWhen?: VisibleWhenConfig })
    .visibleWhen;

  // Subscribe to DOM custom events for the element id
  const domVisible = useElementVisibilityListener(blockId);

  const conditionMet = !visibleWhen || evaluateConditions(visibleWhen, variables);

  return { isVisible: conditionMet && domVisible };
}

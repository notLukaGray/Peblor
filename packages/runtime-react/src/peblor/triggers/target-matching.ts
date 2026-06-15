import { matchesTargetId, readTargetId } from "@/peblor/elements/Element3D/model3d-action-parsing";

export { readTargetId };

/** True when a trigger should apply to this element (broadcast, `all`, or id match). */
export function shouldApplyMediaTarget(
  elementId: string | undefined,
  targetId: string | null
): boolean {
  if (!targetId) return true;
  if (targetId === "all" || targetId === "*") return true;
  if (!elementId) return false;
  return matchesTargetId(elementId, targetId);
}

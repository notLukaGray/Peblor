import type {
  TriggerAction,
  StartTransitionAction,
  StopTransitionAction,
} from "@pb/contracts/peblor/core/peblor-schemas";
import { OVERRIDE_KEY_BG } from "@pb/contracts/peblor/core/peblor-schemas";

export function getTransitionId(
  action: StartTransitionAction | StopTransitionAction
): string | undefined {
  const payload = action.payload;
  if (
    payload != null &&
    typeof payload === "object" &&
    "id" in payload &&
    typeof (payload as { id: unknown }).id === "string" &&
    (payload as { id: string }).id.trim()
  ) {
    return (payload as { id: string }).id;
  }
  return undefined;
}

export function isBgTransitionProgressOverride(
  action: TriggerAction,
  progress: number | null
): boolean {
  if (progress == null || action.payload == null || typeof action.payload !== "object")
    return false;
  const p = action.payload as { key?: unknown; value?: unknown };
  if (p.key !== OVERRIDE_KEY_BG || p.value == null || typeof p.value !== "object") return false;
  return "type" in p.value && (p.value as { type?: string }).type === "backgroundTransition";
}

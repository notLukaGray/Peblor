import type { WorkbenchSessionV2InFlight } from "@/app/dev/workbench/workbench-session-import";

/**
 * No-op legacy migration hook.
 *
 * Kept as a stable seam so we can reintroduce migrations later without touching
 * session consumers.
 */
export function migrateLegacyIntoSession(_session: WorkbenchSessionV2InFlight): boolean {
  return false;
}

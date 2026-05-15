import type { ModuleBlock } from "@pb/contracts/types";

export type ElementAudioSlotsInfo = {
  contentSlotKey: string;
  slotsObj: Record<string, unknown>;
  useSectionSlots: boolean;
};

export function resolveElementAudioSlots(moduleConfig?: ModuleBlock): ElementAudioSlotsInfo {
  const contentSlotKey = moduleConfig?.contentSlot ?? "main";
  const slotsObj =
    moduleConfig &&
    typeof moduleConfig.slots === "object" &&
    moduleConfig.slots !== null &&
    !Array.isArray(moduleConfig.slots)
      ? (moduleConfig.slots as Record<string, unknown>)
      : {};

  const useSectionSlots = Object.entries(slotsObj).some(
    ([key, slot]) =>
      key !== contentSlotKey &&
      (slot as { section?: { definitions?: unknown } })?.section?.definitions
  );

  return { contentSlotKey, slotsObj, useSectionSlots };
}

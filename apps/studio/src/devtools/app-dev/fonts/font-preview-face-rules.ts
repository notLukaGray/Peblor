import type { FontWeightMap } from "@/app/fonts/config";
import { localRolePreviewFamily, type LocalRoleFaceRule } from "@/app/dev/fonts/local-font-preview";
import type { LocalPreviewRuntime } from "@/app/dev/fonts/use-local-font-previews";

export type SlotName = "primary" | "secondary" | "mono";

type SlotState = {
  family: string;
  weights: FontWeightMap;
  italic: boolean;
  source: "local" | "webfont";
  localRoleFiles?: Partial<Record<keyof FontWeightMap, string>>;
};

type SlotPreviewMode = "catalog" | "local";

const WEIGHT_NAMES: (keyof FontWeightMap)[] = ["thin", "light", "regular", "book", "bold", "black"];
const SLOT_NAMES: SlotName[] = ["primary", "secondary", "mono"];

function buildLocalRoleFaceRulesForSlot(
  slot: SlotName,
  slotState: SlotState,
  slotLibrary: LocalPreviewRuntime
): LocalRoleFaceRule[] {
  const rows: LocalRoleFaceRule[] = [];
  for (const name of WEIGHT_NAMES) {
    if (slotState.weights[name] === undefined) continue;
    const fileName = slotState.localRoleFiles?.[name] ?? slotLibrary.files[0]!.fileName;
    const file = slotLibrary.files.find((f) => f.fileName === fileName) ?? slotLibrary.files[0]!;
    rows.push({
      role: name,
      family: localRolePreviewFamily(slot, name),
      url: file.objectUrl,
      format: file.format,
    });
  }
  return rows;
}

export function buildLocalRoleFaceRuleMap({
  configs,
  previews,
  effectiveSlotPreviewMode,
}: {
  configs: Record<SlotName, SlotState>;
  previews: Partial<Record<SlotName, LocalPreviewRuntime>>;
  effectiveSlotPreviewMode: Record<SlotName, SlotPreviewMode>;
}): Partial<Record<SlotName, LocalRoleFaceRule[]>> {
  const bySlot: Partial<Record<SlotName, LocalRoleFaceRule[]>> = {};
  for (const slot of SLOT_NAMES) {
    const slotLibrary = previews[slot];
    if (effectiveSlotPreviewMode[slot] !== "local" || !slotLibrary || !slotLibrary.files.length) {
      continue;
    }
    bySlot[slot] = buildLocalRoleFaceRulesForSlot(slot, configs[slot], slotLibrary);
  }
  return bySlot;
}

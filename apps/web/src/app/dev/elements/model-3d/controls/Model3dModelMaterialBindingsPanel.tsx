import { useMemo, useState } from "react";
import type { Model3dVariantDefaults } from "../types";
import type { Model3dElementDevController } from "../useModel3dElementDevController";
import { asObjectMap } from "./model3d-asset-helpers";
import {
  createMaterialsFromSlots,
  discoverModelSlotsFromGeometry,
  getKnownModelSlots,
  getModelGeometryUrl,
  patchModelBinding,
} from "./model3d-material-studio-helpers";

function applyNormalizedPatch(
  controller: Model3dElementDevController,
  patch: Partial<Model3dVariantDefaults>
) {
  const next = controller.normalizeVariant(controller.active, patch);
  controller.setVariantExact(controller.activeVariant, next);
}

function resolveSelected(current: string, keys: string[]): string {
  if (current && keys.includes(current)) return current;
  return keys[0] ?? "";
}

export function Model3dModelMaterialBindingsPanel({
  controller,
}: {
  controller: Model3dElementDevController;
}) {
  const [selectedMaterialState, setSelectedMaterialState] = useState("");
  const [selectedModelState, setSelectedModelState] = useState("");
  const [selectedSlotState, setSelectedSlotState] = useState("");
  const [discoveredSlotsByModel, setDiscoveredSlotsByModel] = useState<Record<string, string[]>>(
    {}
  );
  const [assetMessage, setAssetMessage] = useState<string | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);

  const materials = useMemo(
    () => asObjectMap(controller.active.materials),
    [controller.active.materials]
  );
  const models = useMemo(() => asObjectMap(controller.active.models), [controller.active.models]);
  const materialKeys = useMemo(() => Object.keys(materials).sort(), [materials]);
  const modelKeys = useMemo(() => Object.keys(models).sort(), [models]);

  const selectedMaterial = resolveSelected(selectedMaterialState, materialKeys);
  const selectedModel = resolveSelected(selectedModelState, modelKeys);
  const knownSlots = useMemo(
    () => (selectedModel ? getKnownModelSlots(models, selectedModel) : []),
    [models, selectedModel]
  );
  const discoveredSlots = useMemo(
    () => (selectedModel ? (discoveredSlotsByModel[selectedModel] ?? []) : []),
    [discoveredSlotsByModel, selectedModel]
  );
  const slotOptions = useMemo(
    () => Array.from(new Set([...knownSlots, ...discoveredSlots])).sort(),
    [knownSlots, discoveredSlots]
  );
  const selectedSlot = resolveSelected(selectedSlotState, slotOptions);

  const bindSelectedMaterialToSlot = () => {
    if (!selectedModel || !selectedMaterial || !selectedSlot) {
      setAssetError("Pick model, material, and slot to link.");
      setAssetMessage(null);
      return;
    }
    const nextModels = patchModelBinding(models, selectedModel, selectedSlot, selectedMaterial);
    applyNormalizedPatch(controller, { models: nextModels } as Partial<Model3dVariantDefaults>);
    setAssetError(null);
    setAssetMessage(`Linked ${selectedMaterial} -> ${selectedModel}:${selectedSlot}`);
  };

  const discoverSlots = async () => {
    if (!selectedModel) {
      setAssetError("Select a model first.");
      setAssetMessage(null);
      return;
    }
    const geometryUrl = getModelGeometryUrl(models, selectedModel);
    if (!geometryUrl) {
      setAssetError("Selected model has no geometry URL.");
      setAssetMessage(null);
      return;
    }
    try {
      const slots = await discoverModelSlotsFromGeometry(geometryUrl);
      setDiscoveredSlotsByModel((prev) => ({ ...prev, [selectedModel]: slots }));
      setAssetError(null);
      setAssetMessage(slots.length > 0 ? `Found ${slots.length} slot(s).` : "No slots discovered.");
    } catch {
      setAssetError("Could not read material slots from this model.");
      setAssetMessage(null);
    }
  };

  const createMaterialsForSlots = () => {
    if (!selectedModel || slotOptions.length === 0) {
      setAssetError("No model slots available to create materials from.");
      setAssetMessage(null);
      return;
    }
    const patch = createMaterialsFromSlots(controller.active, selectedModel, slotOptions);
    applyNormalizedPatch(controller, patch);
    setAssetError(null);
    setAssetMessage("Created missing materials for discovered slots.");
  };

  return (
    <div className="sm:col-span-2 space-y-3 rounded border border-border/60 bg-muted/10 p-3">
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        Model Slot Linking
      </p>

      <div className="flex flex-wrap gap-2">
        <select
          value={selectedModel}
          onChange={(event) => setSelectedModelState(event.target.value)}
          className="min-w-[12rem] rounded border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground"
        >
          <option value="">Select model</option>
          {modelKeys.map((modelKey) => (
            <option key={modelKey} value={modelKey}>
              {modelKey}
            </option>
          ))}
        </select>
        <select
          value={selectedMaterial}
          onChange={(event) => setSelectedMaterialState(event.target.value)}
          className="min-w-[12rem] rounded border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground"
        >
          <option value="">Select material</option>
          {materialKeys.map((materialKey) => (
            <option key={materialKey} value={materialKey}>
              {materialKey}
            </option>
          ))}
        </select>
        <select
          value={selectedSlot}
          onChange={(event) => setSelectedSlotState(event.target.value)}
          className="min-w-[12rem] rounded border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground"
        >
          <option value="">Select slot</option>
          {slotOptions.map((slot) => (
            <option key={slot} value={slot}>
              {slot}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={bindSelectedMaterialToSlot}
          className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
        >
          Link Material
        </button>
        <button
          type="button"
          onClick={() => void discoverSlots()}
          className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
        >
          Discover Slots
        </button>
        <button
          type="button"
          onClick={createMaterialsForSlots}
          className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
        >
          Create Missing Materials
        </button>
      </div>

      {assetError ? <p className="text-[10px] text-rose-300">{assetError}</p> : null}
      {assetMessage ? <p className="text-[10px] text-muted-foreground">{assetMessage}</p> : null}
    </div>
  );
}

import { useState } from "react";
import { isRecord } from "@/app/dev/elements/_shared/asset-input-utils";
import type { Model3dElementDevController } from "../useModel3dElementDevController";
import { Model3dAssetInputControls } from "./Model3dAssetInputControls";
import { Model3dMaterialChannelsPanel } from "./Model3dMaterialChannelsPanel";
import { Model3dModelMaterialBindingsPanel } from "./Model3dModelMaterialBindingsPanel";
import {
  LockedStageCard,
  Model3dAssetEditors,
  Model3dBaseFields,
} from "./Model3dContentCorePanels";

type ContentMode = "guided" | "advanced";

function ModeTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2 py-1 text-[10px] font-mono ${
        active
          ? "border-foreground text-foreground"
          : "border-border text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

function GuidedPanels({
  controller,
  hasUploadedScene,
  hasMaterials,
}: {
  controller: Model3dElementDevController;
  hasUploadedScene: boolean;
  hasMaterials: boolean;
}) {
  return (
    <>
      <Model3dAssetInputControls controller={controller} />
      {hasUploadedScene ? (
        <Model3dMaterialChannelsPanel controller={controller} />
      ) : (
        <LockedStageCard
          title="Stage 2 · Materials"
          body="Upload a scene model to unlock material channel editing."
        />
      )}
      {hasUploadedScene && hasMaterials ? (
        <Model3dModelMaterialBindingsPanel controller={controller} />
      ) : (
        <LockedStageCard
          title="Stage 3 · Slot Linking"
          body="Create at least one material to unlock model-slot linking."
        />
      )}
    </>
  );
}

export function Model3dContentControls({
  controller,
}: {
  controller: Model3dElementDevController;
}) {
  const [contentMode, setContentMode] = useState<ContentMode>("guided");
  const { active, activeVariant, setVariantPatch } = controller;
  const scopeKey = `${activeVariant}-${controller.isCustomVariant ? "custom" : "variant"}`;
  const textureKeys = isRecord(active.textures) ? Object.keys(active.textures) : [];
  const materialKeys = isRecord(active.materials) ? Object.keys(active.materials) : [];
  const modelKeys = isRecord(active.models) ? Object.keys(active.models) : [];
  const hasUploadedScene = modelKeys.length > 0;
  const hasMaterials = materialKeys.length > 0;

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Content
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Guided scene {"->"} materials {"->"} linking flow. JSON is available in Advanced.
        </p>
      </div>

      <div className="sm:col-span-2 flex items-center gap-2">
        <ModeTabButton
          active={contentMode === "guided"}
          label="Guided"
          onClick={() => setContentMode("guided")}
        />
        <ModeTabButton
          active={contentMode === "advanced"}
          label="Advanced"
          onClick={() => setContentMode("advanced")}
        />
      </div>

      {contentMode === "guided" ? (
        <GuidedPanels
          controller={controller}
          hasUploadedScene={hasUploadedScene}
          hasMaterials={hasMaterials}
        />
      ) : (
        <Model3dAssetEditors
          active={active}
          activeVariant={activeVariant}
          setVariantPatch={setVariantPatch}
          scopeKey={scopeKey}
          textureKeys={textureKeys}
          materialKeys={materialKeys}
          modelKeys={modelKeys}
        />
      )}

      <Model3dBaseFields
        active={active}
        activeVariant={activeVariant}
        setVariantPatch={setVariantPatch}
      />
    </>
  );
}

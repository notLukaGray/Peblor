"use client";

import { ElementDevWorkspace } from "@/app/dev/elements/_shared/ElementDevWorkspace";
import { SpacerDevHeader } from "./SpacerDevHeader";
import { SpacerPreviewPanel } from "./SpacerPreviewPanel";
import { SpacerSettingsPanel } from "./SpacerSettingsPanel";
import { SpacerSidebar } from "./SpacerSidebar";
import { SpacerVariantPicker } from "./SpacerVariantPicker";
import { useSpacerElementDevController } from "./useSpacerElementDevController";

export function SpacerElementDevClient() {
  const controller = useSpacerElementDevController();
  return (
    <ElementDevWorkspace
      onReset={controller.resetSpacerDefaults}
      header={<SpacerDevHeader />}
      variantPicker={<SpacerVariantPicker controller={controller} />}
      preview={<SpacerPreviewPanel controller={controller} />}
      settings={<SpacerSettingsPanel controller={controller} />}
      sidebar={<SpacerSidebar controller={controller} />}
    />
  );
}

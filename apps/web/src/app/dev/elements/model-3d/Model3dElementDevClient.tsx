"use client";

import { ElementDevWorkspace } from "@/app/dev/elements/_shared/ElementDevWorkspace";
import { Model3dDevHeader } from "./Model3dDevHeader";
import { Model3dPreviewPanel } from "./Model3dPreviewPanel";
import { Model3dSettingsPanel } from "./Model3dSettingsPanel";
import { Model3dSidebar } from "./Model3dSidebar";
import { Model3dVariantPicker } from "./Model3dVariantPicker";
import { useModel3dElementDevController } from "./useModel3dElementDevController";

export function Model3dElementDevClient() {
  const controller = useModel3dElementDevController();
  return (
    <ElementDevWorkspace
      onReset={controller.resetModel3dDefaults}
      header={<Model3dDevHeader />}
      variantPicker={<Model3dVariantPicker controller={controller} />}
      preview={<Model3dPreviewPanel controller={controller} />}
      settings={<Model3dSettingsPanel controller={controller} />}
      sidebar={<Model3dSidebar controller={controller} />}
    />
  );
}

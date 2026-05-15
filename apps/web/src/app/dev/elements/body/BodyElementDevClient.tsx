"use client";

import { ElementDevWorkspace } from "@/app/dev/elements/_shared/ElementDevWorkspace";
import { BodyDevHeader } from "./BodyDevHeader";
import { BodyPreviewPanel } from "./BodyPreviewPanel";
import { BodySettingsPanel } from "./BodySettingsPanel";
import { BodySidebar } from "./BodySidebar";
import { BodyVariantPicker } from "./BodyVariantPicker";
import { useBodyElementDevController } from "./useBodyElementDevController";

export function BodyElementDevClient() {
  const controller = useBodyElementDevController();
  return (
    <ElementDevWorkspace
      onReset={controller.resetBodyDefaults}
      header={<BodyDevHeader />}
      variantPicker={<BodyVariantPicker controller={controller} />}
      preview={<BodyPreviewPanel controller={controller} />}
      settings={<BodySettingsPanel controller={controller} />}
      sidebar={<BodySidebar controller={controller} />}
    />
  );
}

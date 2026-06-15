"use client";

import { ElementDevWorkspace } from "@/app/dev/elements/_shared/ElementDevWorkspace";
import { ImageDevHeader } from "./ImageDevHeader";
import { ImagePreviewPanel } from "./ImagePreviewPanel";
import { ImageSettingsPanel } from "./ImageSettingsPanel";
import { ImageSidebar } from "./ImageSidebar";
import { ImageVariantPicker } from "./ImageVariantPicker";
import { useImageElementDevController } from "./useImageElementDevController";

export function ImageElementDevClient() {
  const controller = useImageElementDevController();
  return (
    <ElementDevWorkspace
      onReset={controller.resetImageDefaults}
      header={<ImageDevHeader />}
      variantPicker={<ImageVariantPicker controller={controller} />}
      preview={<ImagePreviewPanel controller={controller} />}
      settings={<ImageSettingsPanel controller={controller} />}
      sidebar={<ImageSidebar controller={controller} />}
    />
  );
}

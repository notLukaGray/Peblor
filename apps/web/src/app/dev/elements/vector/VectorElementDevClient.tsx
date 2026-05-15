"use client";

import { ElementDevWorkspace } from "@/app/dev/elements/_shared/ElementDevWorkspace";
import { VectorDevHeader } from "./VectorDevHeader";
import { VectorPreviewPanel } from "./VectorPreviewPanel";
import { VectorSettingsPanel } from "./VectorSettingsPanel";
import { VectorSidebar } from "./VectorSidebar";
import { VectorVariantPicker } from "./VectorVariantPicker";
import { useVectorElementDevController } from "./useVectorElementDevController";

export function VectorElementDevClient() {
  const controller = useVectorElementDevController();
  return (
    <ElementDevWorkspace
      onReset={controller.resetVectorDefaults}
      header={<VectorDevHeader />}
      variantPicker={<VectorVariantPicker controller={controller} />}
      preview={<VectorPreviewPanel controller={controller} />}
      settings={<VectorSettingsPanel controller={controller} />}
      sidebar={<VectorSidebar controller={controller} />}
    />
  );
}

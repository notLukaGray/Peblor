"use client";

import { ElementDevWorkspace } from "@/app/dev/elements/_shared/ElementDevWorkspace";
import { RiveDevHeader } from "./RiveDevHeader";
import { RivePreviewPanel } from "./RivePreviewPanel";
import { RiveSettingsPanel } from "./RiveSettingsPanel";
import { RiveSidebar } from "./RiveSidebar";
import { RiveVariantPicker } from "./RiveVariantPicker";
import { useRiveElementDevController } from "./useRiveElementDevController";

export function RiveElementDevClient() {
  const controller = useRiveElementDevController();
  return (
    <ElementDevWorkspace
      onReset={controller.resetRiveDefaults}
      header={<RiveDevHeader />}
      variantPicker={<RiveVariantPicker controller={controller} />}
      preview={<RivePreviewPanel controller={controller} />}
      settings={<RiveSettingsPanel controller={controller} />}
      sidebar={<RiveSidebar controller={controller} />}
    />
  );
}

"use client";

import { ElementDevWorkspace } from "@/app/dev/elements/_shared/ElementDevWorkspace";
import { ScrollProgressBarDevHeader } from "./ScrollProgressBarDevHeader";
import { ScrollProgressBarPreviewPanel } from "./ScrollProgressBarPreviewPanel";
import { ScrollProgressBarSettingsPanel } from "./ScrollProgressBarSettingsPanel";
import { ScrollProgressBarSidebar } from "./ScrollProgressBarSidebar";
import { ScrollProgressBarVariantPicker } from "./ScrollProgressBarVariantPicker";
import { useScrollProgressBarElementDevController } from "./useScrollProgressBarElementDevController";

export function ScrollProgressBarElementDevClient() {
  const controller = useScrollProgressBarElementDevController();
  return (
    <ElementDevWorkspace
      onReset={controller.resetScrollProgressBarDefaults}
      header={<ScrollProgressBarDevHeader />}
      variantPicker={<ScrollProgressBarVariantPicker controller={controller} />}
      preview={<ScrollProgressBarPreviewPanel controller={controller} />}
      settings={<ScrollProgressBarSettingsPanel controller={controller} />}
      sidebar={<ScrollProgressBarSidebar controller={controller} />}
    />
  );
}

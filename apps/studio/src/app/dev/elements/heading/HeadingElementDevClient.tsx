"use client";

import { ElementDevWorkspace } from "@/app/dev/elements/_shared/ElementDevWorkspace";
import { HeadingDevHeader } from "./HeadingDevHeader";
import { HeadingPreviewPanel } from "./HeadingPreviewPanel";
import { HeadingSettingsPanel } from "./HeadingSettingsPanel";
import { HeadingSidebar } from "./HeadingSidebar";
import { HeadingVariantPicker } from "./HeadingVariantPicker";
import { useHeadingElementDevController } from "./useHeadingElementDevController";

export function HeadingElementDevClient() {
  const controller = useHeadingElementDevController();
  return (
    <ElementDevWorkspace
      onReset={controller.resetHeadingDefaults}
      header={<HeadingDevHeader />}
      variantPicker={<HeadingVariantPicker controller={controller} />}
      preview={<HeadingPreviewPanel controller={controller} />}
      settings={<HeadingSettingsPanel controller={controller} />}
      sidebar={<HeadingSidebar controller={controller} />}
    />
  );
}

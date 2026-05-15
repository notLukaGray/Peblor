"use client";

import { ElementDevWorkspace } from "@/app/dev/elements/_shared/ElementDevWorkspace";
import { RichTextDevHeader } from "./RichTextDevHeader";
import { RichTextPreviewPanel } from "./RichTextPreviewPanel";
import { RichTextSettingsPanel } from "./RichTextSettingsPanel";
import { RichTextSidebar } from "./RichTextSidebar";
import { RichTextVariantPicker } from "./RichTextVariantPicker";
import { useRichTextElementDevController } from "./useRichTextElementDevController";

export function RichTextElementDevClient() {
  const controller = useRichTextElementDevController();
  return (
    <ElementDevWorkspace
      onReset={controller.resetRichTextDefaults}
      header={<RichTextDevHeader />}
      variantPicker={<RichTextVariantPicker controller={controller} />}
      preview={<RichTextPreviewPanel controller={controller} />}
      settings={<RichTextSettingsPanel controller={controller} />}
      sidebar={<RichTextSidebar controller={controller} />}
    />
  );
}

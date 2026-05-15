"use client";

import { ElementDevWorkspace } from "@/app/dev/elements/_shared/ElementDevWorkspace";
import { InputDevHeader } from "./InputDevHeader";
import { InputPreviewPanel } from "./InputPreviewPanel";
import { InputSettingsPanel } from "./InputSettingsPanel";
import { InputSidebar } from "./InputSidebar";
import { InputVariantPicker } from "./InputVariantPicker";
import { useInputElementDevController } from "./useInputElementDevController";

export function InputElementDevClient() {
  const controller = useInputElementDevController();
  return (
    <ElementDevWorkspace
      onReset={controller.resetInputDefaults}
      header={<InputDevHeader />}
      variantPicker={<InputVariantPicker controller={controller} />}
      preview={<InputPreviewPanel controller={controller} />}
      settings={<InputSettingsPanel controller={controller} />}
      sidebar={<InputSidebar controller={controller} />}
    />
  );
}

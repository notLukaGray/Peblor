"use client";

import { ElementDevWorkspace } from "@/app/dev/elements/_shared/ElementDevWorkspace";
import { ButtonDevHeader } from "./ButtonDevHeader";
import { ButtonPreviewPanel } from "./ButtonPreviewPanel";
import { ButtonSettingsPanel } from "./ButtonSettingsPanel";
import { ButtonSidebar } from "./ButtonSidebar";
import { ButtonVariantPicker } from "./ButtonVariantPicker";
import { useButtonElementDevController } from "./useButtonElementDevController";

export function ButtonElementDevClient() {
  const controller = useButtonElementDevController();
  return (
    <ElementDevWorkspace
      onReset={controller.resetButtonDefaults}
      header={<ButtonDevHeader />}
      variantPicker={<ButtonVariantPicker controller={controller} />}
      preview={<ButtonPreviewPanel controller={controller} />}
      settings={<ButtonSettingsPanel controller={controller} />}
      sidebar={<ButtonSidebar controller={controller} />}
    />
  );
}

"use client";

import { ElementDevWorkspace } from "@/app/dev/elements/_shared/ElementDevWorkspace";
import { LinkDevHeader } from "./LinkDevHeader";
import { LinkPreviewPanel } from "./LinkPreviewPanel";
import { LinkSettingsPanel } from "./LinkSettingsPanel";
import { LinkSidebar } from "./LinkSidebar";
import { LinkVariantPicker } from "./LinkVariantPicker";
import { useLinkElementDevController } from "./useLinkElementDevController";

export function LinkElementDevClient() {
  const controller = useLinkElementDevController();
  return (
    <ElementDevWorkspace
      onReset={controller.resetLinkDefaults}
      header={<LinkDevHeader />}
      variantPicker={<LinkVariantPicker controller={controller} />}
      preview={<LinkPreviewPanel controller={controller} />}
      settings={<LinkSettingsPanel controller={controller} />}
      sidebar={<LinkSidebar controller={controller} />}
    />
  );
}

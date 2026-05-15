"use client";

import { ElementDevWorkspace } from "@/app/dev/elements/_shared/ElementDevWorkspace";
import { VideoTimeDevHeader } from "./VideoTimeDevHeader";
import { VideoTimePreviewPanel } from "./VideoTimePreviewPanel";
import { VideoTimeSettingsPanel } from "./VideoTimeSettingsPanel";
import { VideoTimeSidebar } from "./VideoTimeSidebar";
import { VideoTimeVariantPicker } from "./VideoTimeVariantPicker";
import { useVideoTimeElementDevController } from "./useVideoTimeElementDevController";

export function VideoTimeElementDevClient() {
  const controller = useVideoTimeElementDevController();
  return (
    <ElementDevWorkspace
      onReset={controller.resetVideoTimeDefaults}
      header={<VideoTimeDevHeader />}
      variantPicker={<VideoTimeVariantPicker controller={controller} />}
      preview={<VideoTimePreviewPanel controller={controller} />}
      settings={<VideoTimeSettingsPanel controller={controller} />}
      sidebar={<VideoTimeSidebar controller={controller} />}
    />
  );
}

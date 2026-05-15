"use client";

import { ElementDevWorkspace } from "@/app/dev/elements/_shared/ElementDevWorkspace";
import { VideoDevHeader } from "./VideoDevHeader";
import { VideoPreviewPanel } from "./VideoPreviewPanel";
import { VideoSettingsPanel } from "./VideoSettingsPanel";
import { VideoSidebar } from "./VideoSidebar";
import { VideoVariantPicker } from "./VideoVariantPicker";
import { useVideoElementDevController } from "./useVideoElementDevController";

export function VideoElementDevClient() {
  const controller = useVideoElementDevController();
  return (
    <ElementDevWorkspace
      onReset={controller.resetVideoDefaults}
      header={<VideoDevHeader />}
      variantPicker={<VideoVariantPicker controller={controller} />}
      preview={<VideoPreviewPanel controller={controller} />}
      settings={<VideoSettingsPanel controller={controller} />}
      sidebar={<VideoSidebar controller={controller} />}
    />
  );
}

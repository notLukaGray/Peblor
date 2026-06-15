"use client";

import { ElementDevWorkspace } from "@/app/dev/elements/_shared/ElementDevWorkspace";
import { RangeDevHeader } from "./RangeDevHeader";
import { RangePreviewPanel } from "./RangePreviewPanel";
import { RangeSettingsPanel } from "./RangeSettingsPanel";
import { RangeSidebar } from "./RangeSidebar";
import { RangeVariantPicker } from "./RangeVariantPicker";
import { useRangeElementDevController } from "./useRangeElementDevController";

export function RangeElementDevClient() {
  const controller = useRangeElementDevController();
  return (
    <ElementDevWorkspace
      onReset={controller.resetRangeDefaults}
      header={<RangeDevHeader />}
      variantPicker={<RangeVariantPicker controller={controller} />}
      preview={<RangePreviewPanel controller={controller} />}
      settings={<RangeSettingsPanel controller={controller} />}
      sidebar={<RangeSidebar controller={controller} />}
    />
  );
}

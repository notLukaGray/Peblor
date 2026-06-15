"use client";

import { ElementDevWorkspace } from "@/app/dev/elements/_shared/ElementDevWorkspace";
import { SvgDevHeader } from "./SvgDevHeader";
import { SvgPreviewPanel } from "./SvgPreviewPanel";
import { SvgSettingsPanel } from "./SvgSettingsPanel";
import { SvgSidebar } from "./SvgSidebar";
import { SvgVariantPicker } from "./SvgVariantPicker";
import { useSvgElementDevController } from "./useSvgElementDevController";

export function SvgElementDevClient() {
  const controller = useSvgElementDevController();
  return (
    <ElementDevWorkspace
      onReset={controller.resetSvgDefaults}
      header={<SvgDevHeader />}
      variantPicker={<SvgVariantPicker controller={controller} />}
      preview={<SvgPreviewPanel controller={controller} />}
      settings={<SvgSettingsPanel controller={controller} />}
      sidebar={<SvgSidebar controller={controller} />}
    />
  );
}

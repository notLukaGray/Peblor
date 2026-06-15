import type { PbImageLayoutMode } from "@/app/theme/pb-builder-defaults";
import type { ImageElementDevController } from "../useImageElementDevController";

export function handleLayoutModeChange(
  controller: ImageElementDevController,
  nextLayout: PbImageLayoutMode
) {
  const { active, activeVariant, setVariantPatch } = controller;
  if (nextLayout === "fill") {
    setVariantPatch(activeVariant, {
      layoutMode: nextLayout,
      width: active.width ?? "100%",
      height: active.height ?? "100%",
    });
    return;
  }
  if (nextLayout === "constraints") {
    setVariantPatch(activeVariant, {
      layoutMode: nextLayout,
      constraints: active.constraints ?? { minWidth: "12rem", minHeight: "8rem" },
      width: active.width ?? "70%",
    });
    return;
  }
  setVariantPatch(activeVariant, {
    layoutMode: nextLayout,
    aspectRatio: active.aspectRatio ?? "16 / 9",
  });
}

import type { PreviewResolvedVariant } from "@/app/dev/elements/image/preview-motion";

function cropDetailsText(variant: PreviewResolvedVariant): string {
  const crop = variant.imageCrop ?? { x: 0, y: 0, scale: 1 };
  const focal =
    crop.focalX != null && crop.focalY != null
      ? " · focal " + (crop.focalX * 100).toFixed(0) + "%, " + (crop.focalY * 100).toFixed(0) + "%"
      : "";
  return (
    "x " +
    crop.x.toFixed(1) +
    "% · y " +
    crop.y.toFixed(1) +
    "% · scale " +
    crop.scale.toFixed(2) +
    focal
  );
}

export function ImagePreviewFooter({
  layoutSummary,
  canCrop,
  canCropPanZoom,
  objectPositionCropActive,
  previewVariant,
}: {
  layoutSummary: string;
  canCrop: boolean;
  canCropPanZoom: boolean;
  objectPositionCropActive: boolean;
  previewVariant: PreviewResolvedVariant;
}) {
  return (
    <>
      <p className="text-[10px] text-muted-foreground">{layoutSummary}</p>
      {canCropPanZoom ? (
        <p className="text-[10px] text-muted-foreground">
          Object fit crop: left-drag pan · right-drag scale · middle-click focal (saved only, no
          pan) · {cropDetailsText(previewVariant)}
        </p>
      ) : null}
      {!canCropPanZoom && canCrop ? (
        <p className="text-[10px] text-muted-foreground">
          Object position: {previewVariant.objectPosition ?? "50% 50%"}
          {objectPositionCropActive
            ? " · Crop On — drag in frame"
            : " · toggle Crop On to drag in frame"}
        </p>
      ) : null}
    </>
  );
}

import type { Dispatch, RefObject, SetStateAction } from "react";
import type { ImageElementDevController } from "@/app/dev/elements/image/useImageElementDevController";

type Props = {
  inputRef: RefObject<HTMLInputElement | null>;
  controller: ImageElementDevController;
  canCrop: boolean;
  canCropPanZoom: boolean;
  cropMode: boolean;
  setCropMode: Dispatch<SetStateAction<boolean>>;
};

export function ImagePreviewUploadControls({
  inputRef,
  controller,
  canCrop,
  canCropPanZoom,
  cropMode,
  setCropMode,
}: Props) {
  const uploadLabel = controller.previewUploadName
    ? controller.previewUploadName + " · preview-only"
    : "Upload a local file to preview only (not saved)";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          event.target.value = "";
          controller.setPreviewUploadFile(file);
        }}
      />
      <button
        type="button"
        className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
        onClick={() => inputRef.current?.click()}
      >
        Upload Image
      </button>
      {controller.previewUploadUrl ? (
        <button
          type="button"
          className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
          onClick={controller.clearPreviewUpload}
        >
          Clear Image
        </button>
      ) : null}
      {canCrop ? (
        <button
          type="button"
          onClick={() => setCropMode((prev) => !prev)}
          className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
        >
          {cropMode ? "Crop On" : "Crop Off"}
        </button>
      ) : null}
      {canCrop || canCropPanZoom ? (
        <button
          type="button"
          onClick={() => {
            if (canCropPanZoom) {
              controller.setVariantPatch(controller.activeVariant, {
                imageCrop: { x: 0, y: 0, scale: 1 },
              });
              return;
            }
            controller.setVariantPatch(controller.activeVariant, { objectPosition: "50% 50%" });
          }}
          className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
        >
          Center
        </button>
      ) : null}
      <span
        className="text-[10px] text-muted-foreground"
        title={controller.previewUploadName ?? undefined}
      >
        {uploadLabel}
      </span>
    </div>
  );
}

"use client";

import type { RefObject } from "react";
import type { LocalPreviewRuntime } from "@/app/dev/fonts/use-local-font-previews";
import { localUploadSummaryText } from "./font-slot-panel-sections-helpers";

type Props = {
  fileRef: RefObject<HTMLInputElement | null>;
  localLibrary?: LocalPreviewRuntime;
  onLocalUploadFiles: (files: File[]) => void;
  onClearLocal: () => void;
};

export function SlotPanelUploads({
  fileRef,
  localLibrary,
  onLocalUploadFiles,
  onClearLocal,
}: Props) {
  const hasLocalFiles = Boolean(localLibrary && localLibrary.files.length > 0);
  return (
    <div className="rounded border border-border/60 bg-muted/15 px-3 py-2 space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide shrink-0">
          Your files
        </span>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,application/font-woff"
          className="sr-only"
          onChange={(event) => {
            const list = event.target.files ? Array.from(event.target.files) : [];
            event.target.value = "";
            if (!list.length) return;
            onLocalUploadFiles(list);
          }}
        />
        <button
          type="button"
          className="rounded border border-border px-2 py-1 text-[11px] font-mono text-foreground hover:bg-muted/60"
          onClick={() => fileRef.current?.click()}
        >
          Upload files…
        </button>
        {hasLocalFiles && localLibrary ? (
          <>
            <span
              className="text-[11px] font-mono text-muted-foreground truncate max-w-[min(100%,18rem)]"
              title={localLibrary.files.map((file) => file.fileName).join(", ")}
            >
              {localLibrary.files.length} file{localLibrary.files.length === 1 ? "" : "s"}
              {localUploadSummaryText(localLibrary)}
            </span>
            <button
              type="button"
              className="text-[11px] font-mono text-foreground underline-offset-2 hover:underline"
              onClick={onClearLocal}
            >
              Clear all
            </button>
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            Select one or many files · preview stays in this browser only
          </span>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground leading-snug">
        Weights are guessed from file names (e.g. Bold, 700). Fix any row in the list below if a
        file sits on the wrong line.
      </p>
    </div>
  );
}

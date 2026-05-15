"use client";

import { useState } from "react";
import type { TypeScaleConfig } from "@/app/fonts/type-scale";
import type { SlotName, TypeScaleFontPreviewSlot } from "./font-type-scale-preview";
import { TypeScaleRow, type TypeScalePreviewBreakpoint } from "./font-type-scale-row";

const SLOT_UI_LABEL: Record<SlotName, string> = {
  primary: "Primary",
  secondary: "Secondary",
  mono: "Mono",
};

export function TypeScalePanel({
  scale,
  scaleKeys,
  fontPreviewBySlot,
  onUpdate,
  bodySampleText,
}: {
  scale: TypeScaleConfig;
  scaleKeys: (keyof TypeScaleConfig)[];
  fontPreviewBySlot: Record<SlotName, TypeScaleFontPreviewSlot>;
  onUpdate: (s: TypeScaleConfig) => void;
  bodySampleText: string;
}) {
  const [previewBreakpoint, setPreviewBreakpoint] = useState<TypeScalePreviewBreakpoint>("desktop");
  const [previewFontSlot, setPreviewFontSlot] = useState<SlotName>("primary");
  const fp = fontPreviewBySlot[previewFontSlot];

  const updateEntry = (
    key: keyof TypeScaleConfig,
    patch: Partial<TypeScaleConfig[keyof TypeScaleConfig]>
  ) => {
    onUpdate({ ...scale, [key]: { ...scale[key], ...patch } });
  };

  return (
    <div className="rounded-lg border border-border bg-card/20 p-5 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-wide shrink-0 pt-0.5">
          Type Scale
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide">
              Font
            </span>
            <div className="flex gap-1 flex-wrap">
              {(["primary", "secondary", "mono"] as SlotName[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPreviewFontSlot(id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors ${previewFontSlot === id ? "bg-foreground text-background border-transparent" : "text-muted-foreground hover:text-foreground border-border"}`}
                >
                  {SLOT_UI_LABEL[id]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide">
              Size
            </span>
            <div className="flex gap-1">
              {(
                [
                  { id: "desktop" as const, label: "Desktop" },
                  { id: "mobile" as const, label: "Mobile" },
                ] as const
              ).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPreviewBreakpoint(id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors ${previewBreakpoint === id ? "bg-foreground text-background border-transparent" : "text-muted-foreground hover:text-foreground border-border"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {scaleKeys.map((key) => (
        <TypeScaleRow
          key={key}
          scaleKey={key}
          entry={scale[key]}
          previewBreakpoint={previewBreakpoint}
          fp={fp}
          previewFontSlot={previewFontSlot}
          bodySampleText={bodySampleText}
          onUpdateEntry={(patch) => updateEntry(key, patch)}
        />
      ))}
    </div>
  );
}

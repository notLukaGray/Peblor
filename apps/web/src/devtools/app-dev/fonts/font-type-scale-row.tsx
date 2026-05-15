"use client";

import type { CSSProperties } from "react";
import type { FontWeightRole } from "@/app/fonts/config";
import { FONT_WEIGHT_ROLES } from "@/app/fonts/config";
import type { TypeScaleConfig, TypeScaleEntry } from "@/app/fonts/type-scale";
import { TYPE_SCALE_LABELS } from "@/app/fonts/type-scale";
import { localRolePreviewFamily } from "@/app/dev/fonts/local-font-preview";
import type { SlotName, TypeScaleFontPreviewSlot } from "./font-type-scale-preview";

const HEADING_SAMPLE = "LOREM IPSUM\nlorem ipsum";

function typeScaleTwoLineBody(text: string): string {
  const normalized = text.trim();
  const byNl = normalized
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (byNl.length >= 2) return `${byNl[0]}\n${byNl[1]}`;
  if (byNl.length === 1) {
    const single = byNl[0]!;
    const half = Math.floor(single.length / 2);
    let cut = single.lastIndexOf(" ", half);
    if (cut < 12) cut = single.indexOf(" ", half + 1);
    if (cut <= 0) return `${single}\n${single}`;
    const left = single.slice(0, cut).trim();
    const right = single.slice(cut).trim();
    return right.length > 0 ? `${left}\n${right}` : `${left}\n${left}`;
  }
  return `${normalized}\n${normalized}`;
}

function wghtPreviewStyle(
  fontFamilyCss: string,
  weight: number,
  variableFace: boolean
): CSSProperties {
  const style: CSSProperties = { fontFamily: fontFamilyCss, fontWeight: weight };
  if (variableFace) style.fontVariationSettings = `"wght" ${weight}`;
  return style;
}

type ScaleFieldProps = {
  label: string;
  value: number | string;
  isString?: boolean;
  onChange: (v: number | string) => void;
};

function ScaleField({ label, value, isString, onChange }: ScaleFieldProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
      {isString ? (
        <input
          type="text"
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 rounded border border-border bg-background px-2 py-0.5 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      ) : (
        <input
          type="number"
          min={1}
          value={Number(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-16 rounded border border-border bg-background px-2 py-0.5 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      )}
    </div>
  );
}

export type TypeScalePreviewBreakpoint = "desktop" | "mobile";

function resolveTypeScaleSampleWeight(
  weights: TypeScaleFontPreviewSlot["weights"],
  role: FontWeightRole
): number {
  return weights[role] ?? weights.regular ?? weights.book ?? weights.light ?? 400;
}

function resolveTypeScalePreviewFamily(
  fp: TypeScaleFontPreviewSlot,
  previewFontSlot: SlotName,
  isHeading: boolean
): { family: string; useLocalRole: boolean } {
  if (!fp.localRoles) return { family: fp.family, useLocalRole: false };
  const role = isHeading ? fp.localRoles.headingRole : fp.localRoles.bodyRole;
  if (fp.weights[role] === undefined) return { family: fp.family, useLocalRole: false };
  return { family: localRolePreviewFamily(previewFontSlot, role), useLocalRole: true };
}

function resolveTypeScaleRowPreview({
  entry,
  previewBreakpoint,
  fp,
  previewFontSlot,
  scaleKey,
}: {
  entry: TypeScaleEntry;
  previewBreakpoint: TypeScalePreviewBreakpoint;
  fp: TypeScaleFontPreviewSlot;
  previewFontSlot: SlotName;
  scaleKey: keyof TypeScaleConfig;
}) {
  const isHeading = scaleKey.startsWith("heading");
  const previewFontSize = previewBreakpoint === "desktop" ? entry.sizeDesktop : entry.sizeMobile;
  const previewLineHeight =
    previewBreakpoint === "desktop" ? entry.lineHeightDesktop : entry.lineHeightMobile;
  const previewWeight = resolveTypeScaleSampleWeight(fp.weights, entry.fontWeightRole);
  const familyState = resolveTypeScalePreviewFamily(fp, previewFontSlot, isHeading);
  return {
    isHeading,
    previewFontSize,
    previewLineHeight,
    previewWeightCss: familyState.useLocalRole ? 400 : previewWeight,
    previewFamilyCss: familyState.family,
    variableForPreview: fp.variableFace && !familyState.useLocalRole,
  };
}

type TypeScaleRowProps = {
  scaleKey: keyof TypeScaleConfig;
  entry: TypeScaleEntry;
  previewBreakpoint: TypeScalePreviewBreakpoint;
  fp: TypeScaleFontPreviewSlot;
  previewFontSlot: SlotName;
  bodySampleText: string;
  onUpdateEntry: (patch: Partial<TypeScaleEntry>) => void;
};

export function TypeScaleRow({
  scaleKey,
  entry,
  previewBreakpoint,
  fp,
  previewFontSlot,
  bodySampleText,
  onUpdateEntry,
}: TypeScaleRowProps) {
  const preview = resolveTypeScaleRowPreview({
    entry,
    previewBreakpoint,
    fp,
    previewFontSlot,
    scaleKey,
  });

  return (
    <div className="border-b border-border/40 pb-4 last:border-0 last:pb-0 space-y-2">
      <p className="font-mono text-[11px] text-muted-foreground">{TYPE_SCALE_LABELS[scaleKey]}</p>
      <div
        className="text-foreground py-1"
        style={{
          ...wghtPreviewStyle(
            `'${preview.previewFamilyCss}', sans-serif`,
            preview.previewWeightCss,
            preview.variableForPreview
          ),
          fontSize: `${preview.previewFontSize}px`,
          lineHeight: `${preview.previewLineHeight}px`,
          letterSpacing: entry.letterSpacing,
          whiteSpace: "pre-line",
        }}
      >
        {preview.isHeading ? HEADING_SAMPLE : typeScaleTwoLineBody(bodySampleText)}
      </div>
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-0.5 min-w-[7rem]">
          <span className="font-mono text-[10px] text-muted-foreground">Weight</span>
          <select
            value={entry.fontWeightRole}
            onChange={(e) => onUpdateEntry({ fontWeightRole: e.target.value as FontWeightRole })}
            className="rounded border border-border bg-background px-2 py-1 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {FONT_WEIGHT_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        <ScaleField
          label="size desktop (px)"
          value={entry.sizeDesktop}
          onChange={(v) => onUpdateEntry({ sizeDesktop: v as number })}
        />
        <ScaleField
          label="size mobile (px)"
          value={entry.sizeMobile}
          onChange={(v) => onUpdateEntry({ sizeMobile: v as number })}
        />
        <ScaleField
          label="line height (desktop)"
          value={entry.lineHeightDesktop}
          onChange={(v) => onUpdateEntry({ lineHeightDesktop: v as number })}
        />
        <ScaleField
          label="line height (mobile)"
          value={entry.lineHeightMobile}
          onChange={(v) => onUpdateEntry({ lineHeightMobile: v as number })}
        />
        <ScaleField
          label="letter-spacing"
          value={entry.letterSpacing}
          isString
          onChange={(v) => onUpdateEntry({ letterSpacing: v as string })}
        />
      </div>
    </div>
  );
}

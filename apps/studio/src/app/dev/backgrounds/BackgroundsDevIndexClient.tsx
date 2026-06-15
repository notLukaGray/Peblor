"use client";

import { createElement, useMemo, useState } from "react";
import type { bgBlock } from "@pb/contracts";
import { bgBlockSchema } from "@pb/contracts";
import { BG_COMPONENTS, type KnownBgType } from "@/peblor/background";
import { DevWorkbenchNav } from "@/app/dev/_components/DevWorkbenchNav";
import { DevWorkbenchPageShell } from "@/app/dev/_components/DevWorkbenchPageShell";
import { BackgroundControls } from "./BackgroundControls";

export type BackgroundType = KnownBgType;
type BackgroundVideoBlock = Extract<bgBlock, { type: "backgroundVideo" }>;
type BackgroundImageBlock = Extract<bgBlock, { type: "backgroundImage" }>;
type BackgroundVariableBlock = Extract<bgBlock, { type: "backgroundVariable" }>;
type BackgroundTransitionBlock = Extract<bgBlock, { type: "backgroundTransition" }>;

export type BackgroundPatternBlock = Extract<bgBlock, { type: "backgroundPattern" }>;

export type BackgroundDrafts = {
  backgroundVideo: BackgroundVideoBlock;
  backgroundImage: BackgroundImageBlock;
  backgroundVariable: BackgroundVariableBlock;
  backgroundPattern: BackgroundPatternBlock;
  backgroundTransition: BackgroundTransitionBlock;
};

export type BackgroundPatchDraft = <K extends BackgroundType>(
  type: K,
  patch: Partial<BackgroundDrafts[K]>
) => void;

const SVG_IMAGE =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0f172a"/><stop offset="0.45" stop-color="#155e75"/><stop offset="1" stop-color="#f8fafc"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><circle cx="920" cy="220" r="180" fill="#f8fafc" fill-opacity="0.22"/><rect x="160" y="180" width="520" height="320" rx="28" fill="#020617" fill-opacity="0.32" stroke="#ffffff" stroke-opacity="0.18"/></svg>'
  );

const SVG_PATTERN =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" fill="#111827"/><path d="M0 40h80M40 0v80" stroke="#e5e7eb" stroke-opacity="0.16" stroke-width="2"/><circle cx="40" cy="40" r="5" fill="#22d3ee" fill-opacity="0.55"/></svg>'
  );

const DEFAULT_DRAFTS: BackgroundDrafts = {
  backgroundVideo: {
    type: "backgroundVideo",
    video: "/dev/missing-background-demo.mp4",
    poster: "/dev/image-preview-placeholder.svg",
    overlay: "#00000066",
  },
  backgroundImage: {
    type: "backgroundImage",
    image: SVG_IMAGE,
  },
  backgroundVariable: {
    type: "backgroundVariable",
    layers: [
      {
        fill: "linear-gradient(135deg, #111827 0%, #155e75 48%, #f8fafc 100%)",
        opacity: 1,
      },
      {
        fill: "radial-gradient(circle at 72% 26%, rgba(248,250,252,0.24), transparent 34%)",
        blendMode: "screen",
        opacity: 0.9,
      },
    ],
  },
  backgroundPattern: {
    type: "backgroundPattern",
    image: SVG_PATTERN,
    repeat: "repeat",
  },
  backgroundTransition: {
    type: "backgroundTransition",
    from: {
      type: "backgroundVariable",
      layers: [{ fill: "linear-gradient(135deg, #111827, #155e75)", opacity: 1 }],
    },
    to: {
      type: "backgroundVariable",
      layers: [{ fill: "linear-gradient(135deg, #7f1d1d, #f8fafc)", opacity: 1 }],
    },
    mode: "progress",
    progress: 0.45,
    duration: 900,
    easing: "ease-in-out",
  },
};

const BACKGROUND_TYPES: Array<{ type: BackgroundType; label: string; blurb: string }> = [
  {
    type: "backgroundVideo",
    label: "Video",
    blurb: "Full-viewport autoplay video with poster fallback and overlay.",
  },
  {
    type: "backgroundImage",
    label: "Image",
    blurb: "Canvas-rendered full-viewport image background.",
  },
  {
    type: "backgroundVariable",
    label: "Variable",
    blurb: "Layered CSS fills with blend modes and opacity.",
  },
  {
    type: "backgroundPattern",
    label: "Pattern",
    blurb: "Canvas-rendered repeating image pattern.",
  },
  {
    type: "backgroundTransition",
    label: "Transition",
    blurb: "Crossfade between two background blocks by progress or time.",
  },
];

function BackgroundPreview({ block }: { block: bgBlock }) {
  const component = BG_COMPONENTS[block.type as BackgroundType];
  return (
    <div
      className="relative h-[28rem] overflow-hidden rounded-lg border border-border bg-background"
      style={{ transform: "translateZ(0)", isolation: "isolate" }}
    >
      {createElement(component, block)}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-background/90 to-transparent p-5">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Production Background Preview
        </p>
      </div>
    </div>
  );
}

function ValidationBadge({ block }: { block: bgBlock }) {
  const result = bgBlockSchema.safeParse(block);
  return (
    <span
      className={`rounded border px-2 py-1 text-[10px] font-mono ${
        result.success
          ? "border-emerald-500/30 text-emerald-300"
          : "border-destructive/40 text-destructive"
      }`}
    >
      {result.success ? "schema valid" : "schema error"}
    </span>
  );
}

export function BackgroundsDevIndexClient() {
  const [activeType, setActiveType] = useState<BackgroundType>("backgroundVariable");
  const [drafts, setDrafts] = useState<BackgroundDrafts>(DEFAULT_DRAFTS);
  const activeBlock = drafts[activeType];
  const exportJson = useMemo(() => JSON.stringify(activeBlock, null, 2), [activeBlock]);

  const patchDraft: BackgroundPatchDraft = (type, patch) => {
    setDrafts((prev) => ({
      ...prev,
      [type]: { ...prev[type], ...patch },
    }));
  };

  return (
    <DevWorkbenchPageShell
      nav={<DevWorkbenchNav onResetSection={() => setDrafts(DEFAULT_DRAFTS)} />}
    >
      <div className="mb-6 space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Builder Workbench
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Backgrounds</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Edit each background block type against the shared peblor schema.
            </p>
          </div>
          <ValidationBadge block={activeBlock} />
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {BACKGROUND_TYPES.map((entry) => (
          <button
            key={entry.type}
            type="button"
            onClick={() => setActiveType(entry.type)}
            className={`rounded border px-3 py-2 text-left transition-colors ${
              activeType === entry.type
                ? "border-foreground/40 bg-foreground/10 text-foreground"
                : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <span className="block font-mono text-[11px] uppercase tracking-wide">
              {entry.label}
            </span>
            <span className="block max-w-44 text-[11px] leading-4">{entry.blurb}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)]">
        <section className="space-y-5">
          <BackgroundPreview block={activeBlock} />
          <section className="rounded-lg border border-border bg-card/20 p-4">
            <BackgroundControls activeType={activeType} drafts={drafts} patchDraft={patchDraft} />
          </section>
        </section>

        <aside className="space-y-4 rounded-lg border border-border bg-card/20 p-4">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Active JSON
          </p>
          <pre className="max-h-[42rem] overflow-auto rounded border border-border bg-background p-3 text-[11px] leading-5 text-muted-foreground">
            {exportJson}
          </pre>
        </aside>
      </div>
    </DevWorkbenchPageShell>
  );
}

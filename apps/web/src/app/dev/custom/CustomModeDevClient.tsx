"use client";

/* eslint-disable max-lines */

import { useMemo, useState } from "react";
import { DevWorkbenchNav } from "@/app/dev/_components/DevWorkbenchNav";
import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";
import { DevWorkbenchPageShell } from "@/app/dev/_components/DevWorkbenchPageShell";
import { DEV_NEUTRAL_BODY_DEFAULTS } from "@/app/dev/elements/element-dev-baseline";
import { DEFAULT_IMAGE_RUNTIME_DRAFT } from "@/app/dev/elements/image/runtime-draft";
import { buildResolvedTypographyWorkbenchBlock } from "@/app/dev/elements/_shared/typography-workbench-preview";
import { typographyVariantForThemeExport } from "@/app/dev/elements/_shared/typography-export-block";
import { WorkbenchElementPreviewSurface } from "@/app/dev/workbench/workbench-element-preview-surface";
import {
  WorkbenchPreviewProvider,
  type WorkbenchPreviewBreakpoint,
} from "@/app/dev/workbench/workbench-preview-context";
import { elementSchema, sectionSchema, type ElementBlock, type SectionBlock } from "@pb/contracts";
import { ElementRenderer, SectionRenderer } from "@pb/runtime-react/renderers";
import { resolveEntranceMotionsForElement } from "@pb/runtime-react/dev-core";

// ---------------------------------------------------------------------------
// Dev-export definition format
// { [elementKey]: { defaultVariant: string, variants: { [variantKey]: {...} } } }
// Produced by each element workbench's toXxxExportJson helper.
// ---------------------------------------------------------------------------

const DEV_EXPORT_TYPE_MAP: Record<string, string> = {
  heading: "elementHeading",
  body: "elementBody",
  link: "elementLink",
  button: "elementButton",
  "rich-text": "elementRichText",
  richText: "elementRichText",
  image: "elementImage",
  video: "elementVideo",
  "video-time": "elementVideoTime",
  videoTime: "elementVideoTime",
  vector: "elementVector",
  svg: "elementSVG",
  input: "elementInput",
  range: "elementRange",
  spacer: "elementSpacer",
  "scroll-progress-bar": "elementScrollProgressBar",
  scrollProgressBar: "elementScrollProgressBar",
  "model-3d": "elementModel3D",
  model3d: "elementModel3D",
  rive: "elementRive",
  divider: "elementDivider",
  group: "elementGroup",
};

type DefinitionVariant = { key: string; block: ElementBlock };
type DefinitionResult = {
  elementKey: string;
  elementType: string;
  defaultVariant: string;
  variants: DefinitionVariant[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// eslint-disable-next-line complexity
function detectDevExportDefinition(parsed: unknown): DefinitionResult | null {
  if (!isRecord(parsed)) return null;
  const keys = Object.keys(parsed);
  if (keys.length !== 1) return null;
  // Safe cast: length === 1 guarantees index 0 is defined.
  const key = keys[0] as string;
  const value = parsed[key];
  if (!isRecord(value)) return null;
  if (typeof value.defaultVariant !== "string") return null;
  if (!isRecord(value.variants)) return null;

  const elementType: string | undefined = DEV_EXPORT_TYPE_MAP[key];
  if (!elementType) return null;

  const variants: DefinitionVariant[] = [];
  for (const [variantKey, variantData] of Object.entries(
    value.variants as Record<string, unknown>
  )) {
    if (!isRecord(variantData)) continue;
    // Strip dev-only `animation` field → `motionTiming` via shared export helper.
    const exported = typographyVariantForThemeExport(variantData);
    const raw = { type: elementType, ...exported } as Record<string, unknown>;
    const block = resolveEntranceMotionsForElement(raw) as ElementBlock;
    variants.push({ key: variantKey, block });
  }

  if (variants.length === 0) return null;

  return {
    elementKey: key,
    elementType,
    defaultVariant: value.defaultVariant,
    variants,
  };
}

// ---------------------------------------------------------------------------
// Parse result
// ---------------------------------------------------------------------------

type PreviewMode = "element" | "section";

type ParseResult =
  | { elementBlock: ElementBlock; sectionBlock: null; definitionResult: null; error: null }
  | { elementBlock: null; sectionBlock: SectionBlock; definitionResult: null; error: null }
  | { elementBlock: null; sectionBlock: null; definitionResult: DefinitionResult; error: null }
  | { elementBlock: null; sectionBlock: null; definitionResult: null; error: string };

function buildSampleElement(): ElementBlock {
  const defaultVariant = DEV_NEUTRAL_BODY_DEFAULTS.defaultVariant;
  const defaultBody = DEV_NEUTRAL_BODY_DEFAULTS.variants[defaultVariant];
  return buildResolvedTypographyWorkbenchBlock(DEFAULT_IMAGE_RUNTIME_DRAFT, {
    type: "elementBody",
    ...defaultBody,
  });
}

function getInitialCustomJson(mode: PreviewMode): string {
  if (mode === "element") return JSON.stringify(buildSampleElement(), null, 2);
  const section: SectionBlock = {
    type: "contentBlock",
    id: "custom-section-sample",
    gap: "1rem",
    elements: [buildSampleElement()],
  };
  return JSON.stringify(section, null, 2);
}

// eslint-disable-next-line complexity
function parseCustomBlock(mode: PreviewMode, raw: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      elementBlock: null,
      sectionBlock: null,
      definitionResult: null,
      error: error instanceof Error ? error.message : "Invalid JSON.",
    };
  }

  // 1. Try the selected mode's schema first.
  if (mode === "element") {
    const result = elementSchema.safeParse(parsed);
    if (result.success) {
      return { elementBlock: result.data, sectionBlock: null, definitionResult: null, error: null };
    }
    // 2. Fall back: try dev-export definition format.
    const defResult = detectDevExportDefinition(parsed);
    if (defResult) {
      return { elementBlock: null, sectionBlock: null, definitionResult: defResult, error: null };
    }
    return {
      elementBlock: null,
      sectionBlock: null,
      definitionResult: null,
      error: result.error.issues[0]?.message ?? "Invalid element block.",
    };
  }

  // Section mode.
  const result = sectionSchema.safeParse(parsed);
  if (result.success) {
    return { elementBlock: null, sectionBlock: result.data, definitionResult: null, error: null };
  }
  // Also try dev-export definition format in section mode.
  const defResult = detectDevExportDefinition(parsed);
  if (defResult) {
    return { elementBlock: null, sectionBlock: null, definitionResult: defResult, error: null };
  }
  return {
    elementBlock: null,
    sectionBlock: null,
    definitionResult: null,
    error: result.error.issues[0]?.message ?? "Invalid section block.",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CustomModeDevClient() {
  const [mode, setMode] = useState<PreviewMode>("element");
  const [rawJson, setRawJson] = useState<string>(() => getInitialCustomJson("element"));
  const [previewBreakpoint, setPreviewBreakpoint] = useState<WorkbenchPreviewBreakpoint>("desktop");

  const parsed = useMemo(() => parseCustomBlock(mode, rawJson), [mode, rawJson]);

  const formatJson = () => {
    try {
      setRawJson(JSON.stringify(JSON.parse(rawJson), null, 2));
    } catch {
      // keep existing input when json is invalid.
    }
  };

  const resetSample = () => setRawJson(getInitialCustomJson(mode));

  return (
    <DevWorkbenchPageShell nav={<DevWorkbenchNav />}>
      <DevWorkbenchPageHeader
        eyebrow="Dev · Builder"
        title="Custom JSON"
        showSessionBadge
        description="Output-only scratch mode for block experiments. Paste any element, section, or element-definition JSON to live-preview and validate it against the peblor schema — without touching workbench variants or persisted defaults."
        affects="preview context only — this tool is read-only and never mutates session variants or defaults"
      />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
        <section className="space-y-3 rounded-lg border border-border bg-card/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              Input JSON
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="font-mono uppercase tracking-wide">Mode</span>
                <select
                  className="rounded border border-border bg-background px-2 py-1 font-mono text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  value={mode}
                  onChange={(e) => {
                    const next = e.target.value as PreviewMode;
                    setMode(next);
                    setRawJson(getInitialCustomJson(next));
                  }}
                >
                  <option value="element">element</option>
                  <option value="section">section</option>
                </select>
              </label>
              <button
                type="button"
                onClick={formatJson}
                className="rounded border border-border px-2.5 py-1 text-[10px] font-mono text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                Format
              </button>
              <button
                type="button"
                onClick={resetSample}
                className="rounded border border-border px-2.5 py-1 text-[10px] font-mono text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                Reset sample
              </button>
            </div>
          </div>
          <textarea
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            spellCheck={false}
            className="h-[38rem] w-full resize-y rounded border border-border bg-background px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </section>

        <section className="space-y-3 rounded-lg border border-border bg-card/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              Preview
            </p>
            <label className="inline-flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="font-mono uppercase tracking-wide">Viewport</span>
              <select
                className="rounded border border-border bg-background px-2 py-1 font-mono text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={previewBreakpoint}
                onChange={(e) => setPreviewBreakpoint(e.target.value as WorkbenchPreviewBreakpoint)}
              >
                <option value="desktop">desktop</option>
                <option value="mobile">mobile</option>
              </select>
            </label>
          </div>

          {parsed.error ? (
            <div className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-wide text-destructive">
                Parse error
              </p>
              <p className="mt-1 text-xs text-destructive/90">{parsed.error}</p>
            </div>
          ) : null}

          <WorkbenchPreviewProvider breakpoint={previewBreakpoint}>
            <div className="rounded-md border border-border/60 bg-background/50 p-4">
              {parsed.elementBlock ? (
                <WorkbenchElementPreviewSurface foundationTheme="dark" className="rounded-md p-4">
                  <ElementRenderer block={parsed.elementBlock} forceEntranceAnimation />
                </WorkbenchElementPreviewSurface>
              ) : parsed.sectionBlock ? (
                <WorkbenchElementPreviewSurface foundationTheme="dark" className="rounded-md p-4">
                  <SectionRenderer section={parsed.sectionBlock} isFirstSection />
                </WorkbenchElementPreviewSurface>
              ) : parsed.definitionResult ? (
                <DefinitionPreview result={parsed.definitionResult} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Valid {mode} JSON to preview appears here.
                </p>
              )}
            </div>
          </WorkbenchPreviewProvider>

          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Custom mode is scratch-only. Accepts raw element/section blocks or element-definition
            exports from the workbench (e.g.{" "}
            <code className="font-mono">{"{ range: { defaultVariant, variants: { … } } }"}</code>
            ).
          </p>
        </section>
      </div>
    </DevWorkbenchPageShell>
  );
}

// ---------------------------------------------------------------------------
// Definition preview — renders all variants from a workbench export
// ---------------------------------------------------------------------------

function DefinitionPreview({ result }: { result: DefinitionResult }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {result.elementType}
        </span>
        <span className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
          {result.variants.length} variant{result.variants.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="space-y-3">
        {result.variants.map(({ key, block }) => (
          <div key={key} className="space-y-1.5">
            <p className="font-mono text-[10px] text-muted-foreground">
              {key}
              {key === result.defaultVariant ? (
                <span className="ml-1.5 text-[9px] opacity-50">default</span>
              ) : null}
            </p>
            <WorkbenchElementPreviewSurface foundationTheme="dark" className="rounded-md p-4">
              <ElementRenderer block={block} forceEntranceAnimation />
            </WorkbenchElementPreviewSurface>
          </div>
        ))}
      </div>
    </div>
  );
}

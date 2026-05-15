"use client";

/* eslint-disable max-lines */

import { useMemo, useState } from "react";
import { DevWorkbenchNav } from "@/app/dev/_components/DevWorkbenchNav";
import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";
import { DevWorkbenchPageShell } from "@/app/dev/_components/DevWorkbenchPageShell";
import { WorkbenchElementPreviewSurface } from "@/app/dev/workbench/workbench-element-preview-surface";
import {
  WorkbenchPreviewProvider,
  type WorkbenchPreviewBreakpoint,
} from "@/app/dev/workbench/workbench-preview-context";
import { buildResolvedTypographyWorkbenchBlock } from "@/app/dev/elements/_shared/typography-workbench-preview";
import { DEFAULT_IMAGE_RUNTIME_DRAFT } from "@/app/dev/elements/image/runtime-draft";
import { getWorkbenchSession } from "@/app/dev/workbench/workbench-session";
import { ElementRenderer } from "@pb/runtime-react/renderers";

type TabId = "overview" | "colors" | "typography" | "components";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "colors", label: "Colors" },
  { id: "typography", label: "Typography" },
  { id: "components", label: "Components" },
];

const COLOR_SWATCHES = [
  { label: "Primary", bg: "var(--pb-primary)", fg: "var(--pb-on-primary)" },
  { label: "Secondary", bg: "var(--pb-secondary)", fg: "var(--pb-on-secondary)" },
  { label: "Accent", bg: "var(--pb-accent)", fg: "var(--pb-on-accent)" },
  { label: "Surface root", bg: "var(--pb-surface-root)", fg: "var(--pb-text-primary)" },
  { label: "Surface muted", bg: "var(--pb-surface-muted)", fg: "var(--pb-text-primary)" },
  { label: "Border", bg: "var(--pb-border)", fg: "var(--pb-text-primary)" },
] as const;

const SEMANTIC_TOKEN_ROWS = [
  { token: "--pb-primary", label: "Primary" },
  { token: "--pb-secondary", label: "Secondary" },
  { token: "--pb-accent", label: "Accent" },
  { token: "--pb-on-primary", label: "On Primary" },
  { token: "--pb-on-secondary", label: "On Secondary" },
  { token: "--pb-on-accent", label: "On Accent" },
  { token: "--pb-surface-root", label: "Surface root" },
  { token: "--pb-surface-muted", label: "Surface Muted" },
  { token: "--pb-border", label: "Border" },
  { token: "--pb-border-strong", label: "Border Strong" },
] as const;

// eslint-disable-next-line complexity
function OverviewTab() {
  const session = getWorkbenchSession();
  const elementCount = Object.keys(session.elements ?? {}).length;
  const hasColors = !!session.colors;
  const hasFonts = !!session.fonts;
  const hasStyle = !!session.style;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Proving ground for all workbench defaults. Values here reflect the current workbench
        session. Change foundations, layout, or element defaults in their respective routes — this
        page shows the combined output.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded border border-border bg-background/60 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Colors
          </p>
          <p
            className={`mt-1 text-sm font-semibold ${hasColors ? "text-foreground" : "text-muted-foreground"}`}
          >
            {hasColors ? "Session" : "Baseline defaults"}
          </p>
        </div>
        <div className="rounded border border-border bg-background/60 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Fonts
          </p>
          <p
            className={`mt-1 text-sm font-semibold ${hasFonts ? "text-foreground" : "text-muted-foreground"}`}
          >
            {hasFonts ? "Session" : "Baseline defaults"}
          </p>
        </div>
        <div className="rounded border border-border bg-background/60 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Style
          </p>
          <p
            className={`mt-1 text-sm font-semibold ${hasStyle ? "text-foreground" : "text-muted-foreground"}`}
          >
            {hasStyle ? "Session" : "Baseline defaults"}
          </p>
        </div>
        <div className="rounded border border-border bg-background/60 p-3 sm:col-span-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Elements
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {elementCount > 0
              ? `${elementCount} element${elementCount !== 1 ? "s" : ""} customised`
              : "All at baseline defaults"}
          </p>
        </div>
      </div>

      <div className="rounded border border-border/60 bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground">
        Use Colors, Typography, and Components tabs to validate session output visually. Navigate to
        individual routes to change values.
      </div>
    </div>
  );
}

function ColorsTab({ previewBreakpoint }: { previewBreakpoint: WorkbenchPreviewBreakpoint }) {
  return (
    <WorkbenchPreviewProvider breakpoint={previewBreakpoint}>
      <WorkbenchElementPreviewSurface
        foundationTheme="dark"
        className="space-y-4 rounded-md border border-border/40 p-4"
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {COLOR_SWATCHES.map((swatch) => (
            <div
              key={swatch.label}
              className="rounded border border-border/40 px-3 py-4 text-center"
              style={{ background: swatch.bg, color: swatch.fg }}
            >
              <p className="font-mono text-[10px] uppercase tracking-wide">{swatch.label}</p>
              <p className="mt-1 text-xs opacity-70">
                <code>{swatch.bg}</code>
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-1 rounded border border-border bg-background/60 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Semantic token reference
          </p>
          {SEMANTIC_TOKEN_ROWS.map((row) => (
            <div key={row.token} className="flex items-center gap-3 py-0.5">
              <div
                className="h-4 w-4 shrink-0 rounded border border-border/40"
                style={{ background: `var(${row.token})` }}
              />
              <span className="font-mono text-[10px] text-muted-foreground">{row.label}</span>
              <span className="font-mono text-[10px] text-muted-foreground/60">{row.token}</span>
            </div>
          ))}
        </div>
      </WorkbenchElementPreviewSurface>
    </WorkbenchPreviewProvider>
  );
}

function TypographyTab({ previewBreakpoint }: { previewBreakpoint: WorkbenchPreviewBreakpoint }) {
  const session = getWorkbenchSession();
  const headingVariants = session.elements?.heading?.variants as
    | Record<string, Record<string, unknown>>
    | undefined;
  const bodyVariants = session.elements?.body?.variants as
    | Record<string, Record<string, unknown>>
    | undefined;

  const displayBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        DEFAULT_IMAGE_RUNTIME_DRAFT,
        {
          type: "elementHeading",
          text: (headingVariants?.display?.text as string | undefined) ?? "Display Heading",
          level: 1,
          ...(headingVariants?.display ?? {}),
        },
        { mode: "guided" }
      ),
    [headingVariants]
  );

  const sectionBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        DEFAULT_IMAGE_RUNTIME_DRAFT,
        {
          type: "elementHeading",
          text: (headingVariants?.section?.text as string | undefined) ?? "Section Heading",
          level: 2,
          ...(headingVariants?.section ?? {}),
        },
        { mode: "guided" }
      ),
    [headingVariants]
  );

  const bodyLeadBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        DEFAULT_IMAGE_RUNTIME_DRAFT,
        {
          type: "elementBody",
          text: "Lead paragraph: larger body copy that introduces a section with increased visual weight and spacing.",
          ...(bodyVariants?.lead ?? {}),
        },
        { mode: "guided" }
      ),
    [bodyVariants]
  );

  const bodyStandardBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        DEFAULT_IMAGE_RUNTIME_DRAFT,
        {
          type: "elementBody",
          text: "Standard body: the primary reading type for content blocks. Line height and spacing are tuned for long-form reading.",
          ...(bodyVariants?.standard ?? {}),
        },
        { mode: "guided" }
      ),
    [bodyVariants]
  );

  const bodyFineBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        DEFAULT_IMAGE_RUNTIME_DRAFT,
        {
          type: "elementBody",
          text: "Fine print: captions, metadata, and auxiliary copy at reduced size.",
          ...(bodyVariants?.fine ?? {}),
        },
        { mode: "guided" }
      ),
    [bodyVariants]
  );

  return (
    <WorkbenchPreviewProvider breakpoint={previewBreakpoint}>
      <div className="rounded-md border border-border/80 overflow-hidden">
        <WorkbenchElementPreviewSurface foundationTheme="dark" className="space-y-3 p-6">
          <div className="border-b pb-3" style={{ borderColor: "var(--pb-border)" }}>
            <ElementRenderer block={displayBlock} />
          </div>
          <div className="border-b pb-3" style={{ borderColor: "var(--pb-border)" }}>
            <ElementRenderer block={sectionBlock} />
          </div>
          <div className="border-b pb-3" style={{ borderColor: "var(--pb-border)" }}>
            <ElementRenderer block={bodyLeadBlock} />
          </div>
          <div className="border-b pb-3" style={{ borderColor: "var(--pb-border)" }}>
            <ElementRenderer block={bodyStandardBlock} />
          </div>
          <div>
            <ElementRenderer block={bodyFineBlock} />
          </div>
        </WorkbenchElementPreviewSurface>
      </div>
    </WorkbenchPreviewProvider>
  );
}

function ComponentsTab({ previewBreakpoint }: { previewBreakpoint: WorkbenchPreviewBreakpoint }) {
  const session = getWorkbenchSession();
  const buttonVariants = session.elements?.button?.variants as
    | Record<string, Record<string, unknown>>
    | undefined;

  const defaultButtonBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        DEFAULT_IMAGE_RUNTIME_DRAFT,
        {
          type: "elementButton",
          label: (buttonVariants?.default?.label as string | undefined) ?? "Default",
          ...(buttonVariants?.default ?? {}),
        },
        { mode: "guided" }
      ),
    [buttonVariants]
  );

  const accentButtonBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        DEFAULT_IMAGE_RUNTIME_DRAFT,
        {
          type: "elementButton",
          label: (buttonVariants?.accent?.label as string | undefined) ?? "Accent",
          ...(buttonVariants?.accent ?? {}),
        },
        { mode: "guided" }
      ),
    [buttonVariants]
  );

  const ghostButtonBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        DEFAULT_IMAGE_RUNTIME_DRAFT,
        {
          type: "elementButton",
          label: (buttonVariants?.ghost?.label as string | undefined) ?? "Ghost",
          ...(buttonVariants?.ghost ?? {}),
        },
        { mode: "guided" }
      ),
    [buttonVariants]
  );

  return (
    <WorkbenchPreviewProvider breakpoint={previewBreakpoint}>
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Buttons
          </p>
          <div className="rounded-md border border-border/80 overflow-hidden">
            <WorkbenchElementPreviewSurface
              foundationTheme="dark"
              className="flex flex-wrap gap-3 p-6"
            >
              <ElementRenderer block={defaultButtonBlock} />
              <ElementRenderer block={accentButtonBlock} />
              <ElementRenderer block={ghostButtonBlock} />
            </WorkbenchElementPreviewSurface>
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Color context
          </p>
          <div className="rounded-md border border-border/80 overflow-hidden">
            <WorkbenchElementPreviewSurface
              foundationTheme="dark"
              className="grid gap-3 p-6 sm:grid-cols-2"
            >
              <div
                className="rounded-md border p-6"
                style={{
                  borderColor: "var(--pb-border)",
                  background: "var(--pb-primary)",
                  color: "var(--pb-on-primary)",
                }}
              >
                <p className="font-mono text-[10px] uppercase tracking-wide opacity-70">
                  Primary surface
                </p>
                <p className="mt-2 text-sm">
                  Text on primary color token. Validates on-color contrast.
                </p>
              </div>
              <div
                className="rounded-md border p-6"
                style={{
                  borderColor: "var(--pb-border)",
                  background: "var(--pb-surface-muted)",
                  color: "var(--pb-text-primary)",
                }}
              >
                <p className="font-mono text-[10px] uppercase tracking-wide opacity-70">
                  Surface muted
                </p>
                <p className="mt-2 text-sm">
                  Text on surface-muted token. Validates card/panel contrast.
                </p>
              </div>
            </WorkbenchElementPreviewSurface>
          </div>
        </div>
      </div>
    </WorkbenchPreviewProvider>
  );
}

export function DevTestClient() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [previewBreakpoint, setPreviewBreakpoint] = useState<WorkbenchPreviewBreakpoint>("desktop");

  const tabContent = useMemo(() => {
    if (activeTab === "overview") return <OverviewTab />;
    if (activeTab === "colors") return <ColorsTab previewBreakpoint={previewBreakpoint} />;
    if (activeTab === "typography") return <TypographyTab previewBreakpoint={previewBreakpoint} />;
    return <ComponentsTab previewBreakpoint={previewBreakpoint} />;
  }, [activeTab, previewBreakpoint]);

  return (
    <DevWorkbenchPageShell
      nav={
        <DevWorkbenchNav
          onResetSection={() => setActiveTab("overview")}
          onTotalReset={() => setActiveTab("overview")}
        />
      }
    >
      <DevWorkbenchPageHeader
        eyebrow="Dev · Preview"
        title="Defaults test page"
        showSessionBadge
        description="Session-driven composite preview. Values here reflect the current workbench session — navigate to individual routes to change foundations, layout, or element defaults and see the combined output here."
        affects="typography, color swatches, button variants, and component compositions — validates cross-surface propagation from a single route pass"
        actions={
          <label className="inline-flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="font-mono uppercase tracking-wide">Viewport</span>
            <select
              value={previewBreakpoint}
              onChange={(e) => setPreviewBreakpoint(e.target.value as WorkbenchPreviewBreakpoint)}
              className="rounded border border-border bg-background px-2 py-1 font-mono text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="desktop">desktop</option>
              <option value="tablet">tablet</option>
              <option value="mobile">mobile</option>
            </select>
          </label>
        }
      />

      <section className="rounded-lg border border-border bg-card/20 p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded border px-3 py-1.5 text-[11px] font-mono transition-colors ${
                activeTab === tab.id
                  ? "border-foreground/40 bg-foreground/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {tabContent}
      </section>
    </DevWorkbenchPageShell>
  );
}

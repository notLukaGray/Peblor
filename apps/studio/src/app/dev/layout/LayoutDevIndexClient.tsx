"use client";

import Link from "next/link";
import { DevWorkbenchNav } from "@/app/dev/_components/DevWorkbenchNav";
import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";
import { DevWorkbenchPageShell } from "@/app/dev/_components/DevWorkbenchPageShell";

const LAYOUT_SURFACES = [
  {
    title: "Pages",
    href: "/dev/layout/pages",
    description:
      "Z-index layer scale and opacity scale — controls stacking for overlays, modals, toasts, and tooltips.",
    preview: "Preview: stacked colored layers at configured z-index values.",
  },
  {
    title: "Sections",
    href: "/dev/layout/sections",
    description:
      "Breakpoint thresholds, content width presets, and section margin scale — the horizontal rhythm of every page.",
    preview: "Preview: section blocks at configured content widths and margins.",
  },
  {
    title: "Columns",
    href: "/dev/layout/columns",
    description:
      "Section-column grid: responsive column count, mode (fixed vs auto), and gap. Used inside sectionColumn blocks.",
    preview: "Preview: grid at current column count, mode, and gap setting.",
  },
  {
    title: "Scroll",
    href: "/dev/layout/scroll",
    description:
      "Scroll-container direction, snap behavior, progress trigger wiring, and live scrollable preview.",
    preview: "Preview: scrollable container with current settings.",
  },
  {
    title: "Frames",
    href: "/dev/layout/frames",
    description:
      "Content-block (frame) fallback flex defaults, padding tokens, and border-radius. The inner box of every layout block.",
    preview: "Preview: frame block with current flex, spacing, and radius tokens.",
  },
  {
    title: "Section Trigger",
    href: "/dev/layout/section-trigger",
    description:
      "Visible, invisible, progress, keyboard, timer, cursor, scroll-direction, idle, and visibleWhen trigger wiring.",
    preview: "Preview: sentinel section with live trigger event log.",
  },
  {
    title: "Reveal Section",
    href: "/dev/layout/reveal-section",
    description:
      "Expandable section behavior: reveal conditions, motion presets, sizes, and nested revealed content.",
    preview: "Preview: clickable reveal section rendered through SectionRenderer.",
  },
  {
    title: "Form Block",
    href: "/dev/layout/form-block",
    description:
      "Form section surface with live field rendering, action metadata, method, fill, and content sizing.",
    preview: "Preview: formBlock section rendered with production form fields.",
  },
  {
    title: "Divider",
    href: "/dev/layout/divider",
    description:
      "Section divider variant for standalone spacing, fill, borders, margins, and section-level triggers.",
    preview: "Preview: empty section divider rendered through SectionRenderer.",
  },
] as const;

export function LayoutDevIndexClient() {
  return (
    <DevWorkbenchPageShell nav={<DevWorkbenchNav />}>
      <DevWorkbenchPageHeader
        eyebrow="Dev · Layout"
        title="Layout Workbench"
        showSessionBadge
        description="Layout editors grouped by surface. Each surface controls a distinct layer of the peblor layout model — pick the one you need."
        affects="section structure, frame defaults, grid layouts, scroll containers, and page-layer stacking across all peblor pages"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {LAYOUT_SURFACES.map((surface) => (
          <Link
            key={surface.href}
            href={surface.href}
            className="group rounded-lg border border-border bg-card/20 p-4 transition-colors hover:bg-muted/30"
          >
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              Layout · {surface.title}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{surface.description}</p>
            <p className="mt-3 font-mono text-[10px] text-muted-foreground/60 group-hover:text-muted-foreground">
              {surface.preview}
            </p>
          </Link>
        ))}
      </div>
    </DevWorkbenchPageShell>
  );
}

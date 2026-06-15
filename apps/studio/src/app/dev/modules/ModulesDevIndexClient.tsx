"use client";

import { useMemo, useState } from "react";
import type { ElementBlock, ModuleBlock } from "@pb/contracts";
import { moduleSchema } from "@pb/contracts";
import { DeviceTypeProvider } from "@pb/runtime-react/core/providers/device-type-provider";
import { ElementRenderer } from "@pb/runtime-react/renderers";
import { DevWorkbenchNav } from "@/app/dev/_components/DevWorkbenchNav";
import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";
import { DevWorkbenchPageShell } from "@/app/dev/_components/DevWorkbenchPageShell";

type SlotKey = "topBar" | "centerOverlay" | "bottomBar";

const SLOT_KEYS: SlotKey[] = ["topBar", "centerOverlay", "bottomBar"];

function controlClassName(): string {
  return "rounded border border-border bg-background px-2.5 py-2 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-[11px] text-muted-foreground">
      <span className="font-mono uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

function slotPosition(key: SlotKey): Partial<ModuleBlock["slots"][string]> {
  if (key === "topBar") return { top: "1rem", left: "1rem", right: "1rem" };
  if (key === "centerOverlay")
    return { inset: "0", alignItems: "center", justifyContent: "center" };
  return { bottom: "1rem", left: "1rem", right: "1rem" };
}

function makeSlot(
  key: SlotKey,
  label: string,
  gap: string,
  padding: string
): ModuleBlock["slots"][string] {
  return {
    position: "absolute",
    display: "flex",
    flexDirection: key === "centerOverlay" ? "column" : "row",
    alignItems: "center",
    justifyContent: key === "bottomBar" ? "space-between" : "center",
    gap,
    padding,
    flexWrap: "wrap",
    style: {
      border: "1px solid rgba(255,255,255,0.16)",
      borderRadius: "0.5rem",
      background: "rgba(0,0,0,0.42)",
      backdropFilter: "blur(10px)",
    },
    expandDurationMs: 260,
    elementRevealMs: 220,
    elementRevealStaggerMs: 40,
    section: {
      elementOrder: ["label", "time"],
      definitions: {
        label: {
          type: "elementBody",
          text: label,
          level: 4,
          wordWrap: true,
          width: "hug",
        },
        time: {
          type: "elementVideoTime",
          format: "mm:ss",
          width: "4rem",
        },
      },
    },
    ...slotPosition(key),
  };
}

function buildModule(
  activeSlot: SlotKey,
  label: string,
  gap: string,
  padding: string
): ModuleBlock {
  return {
    type: "module",
    contextType: "video",
    contentSlot: "video",
    container: {
      aspectRatio: "16 / 9",
      borderRadius: "0.75rem",
      padding: "0",
    },
    behavior: {
      controlsTransitionMs: 260,
      sleepAfterMs: 2400,
    },
    slots: {
      video: {
        position: "absolute",
        inset: "0",
        expandDurationMs: 260,
        elementRevealMs: 220,
        elementRevealStaggerMs: 40,
        section: { elementOrder: [], definitions: {} },
      },
      topBar: makeSlot("topBar", activeSlot === "topBar" ? label : "Top slot", gap, padding),
      centerOverlay: makeSlot(
        "centerOverlay",
        activeSlot === "centerOverlay" ? label : "Center slot",
        gap,
        padding
      ),
      bottomBar: makeSlot(
        "bottomBar",
        activeSlot === "bottomBar" ? label : "Bottom slot",
        gap,
        padding
      ),
    },
  };
}

function SchemaBadge({ moduleConfig }: { moduleConfig: ModuleBlock }) {
  const parsed = moduleSchema.safeParse(moduleConfig);
  return (
    <span
      className={`rounded border px-2 py-1 text-[10px] font-mono ${
        parsed.success
          ? "border-emerald-500/30 text-emerald-300"
          : "border-destructive/40 text-destructive"
      }`}
    >
      {parsed.success ? "schema valid" : "schema error"}
    </span>
  );
}

export function ModulesDevIndexClient() {
  const [activeSlot, setActiveSlot] = useState<SlotKey>("bottomBar");
  const [label, setLabel] = useState("Injected live section");
  const [gap, setGap] = useState("0.75rem");
  const [padding, setPadding] = useState("0.75rem 1rem");
  const moduleConfig = useMemo(
    () => buildModule(activeSlot, label, gap, padding),
    [activeSlot, label, gap, padding]
  );
  const previewBlock = useMemo(
    () =>
      ({
        type: "elementVideo",
        width: "100%",
        aspectRatio: "16 / 9",
        showPlayButton: true,
        src: "",
        poster: "/dev/image-preview-placeholder.svg",
        moduleConfig,
      }) as unknown as ElementBlock,
    [moduleConfig]
  );

  return (
    <DevWorkbenchPageShell nav={<DevWorkbenchNav />}>
      <DevWorkbenchPageHeader
        eyebrow="Dev · Builder"
        title="Modules"
        description="Edit module slot layout and inject live section definitions into the production module renderer."
        affects="module blocks, slot layout, nested section definitions, overlay motion, and media module composition"
        showSessionBadge
      />
      <div className="mb-4 flex justify-end">
        <SchemaBadge moduleConfig={moduleConfig} />
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)]">
        <section className="space-y-5">
          <div className="rounded-lg border border-border bg-card/20 p-4">
            <div className="rounded border border-dashed border-border/70 bg-background/60 p-5">
              <DeviceTypeProvider>
                <ElementRenderer block={previewBlock} />
              </DeviceTypeProvider>
            </div>
          </div>
          <section className="rounded-lg border border-border bg-card/20 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Active slot">
                <select
                  value={activeSlot}
                  onChange={(event) => setActiveSlot(event.target.value as SlotKey)}
                  className={controlClassName()}
                >
                  {SLOT_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Injected label">
                <input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  className={controlClassName()}
                />
              </Field>
              <Field label="Gap">
                <input
                  value={gap}
                  onChange={(event) => setGap(event.target.value)}
                  className={controlClassName()}
                />
              </Field>
              <Field label="Padding">
                <input
                  value={padding}
                  onChange={(event) => setPadding(event.target.value)}
                  className={controlClassName()}
                />
              </Field>
            </div>
          </section>
        </section>
        <aside className="space-y-4 rounded-lg border border-border bg-card/20 p-4">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Module JSON
          </p>
          <pre className="max-h-[42rem] overflow-auto rounded border border-border bg-background p-3 text-[11px] leading-5 text-muted-foreground">
            {JSON.stringify(moduleConfig, null, 2)}
          </pre>
        </aside>
      </div>
    </DevWorkbenchPageShell>
  );
}

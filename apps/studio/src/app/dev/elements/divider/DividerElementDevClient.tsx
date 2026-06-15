"use client";

import { useMemo, useState } from "react";
import type { ElementBlock } from "@pb/contracts";
import { ElementRenderer } from "@pb/runtime-react/client";
import { DevWorkbenchNav } from "@/app/dev/_components/DevWorkbenchNav";
import { DevWorkbenchPageShell } from "@/app/dev/_components/DevWorkbenchPageShell";
import { themeStringToInputValue } from "@/app/dev/elements/_shared/theme-string";

type DividerBlock = Extract<ElementBlock, { type: "elementDivider" }>;
type DividerStyle = NonNullable<DividerBlock["style"]>;
type DividerOrientation = NonNullable<DividerBlock["orientation"]>;

const DEFAULT_DIVIDER: DividerBlock = {
  type: "elementDivider",
  orientation: "horizontal",
  thickness: "1px",
  color: "rgba(255,255,255,0.72)",
  style: "solid",
  length: "100%",
  marginTop: "1rem",
  marginBottom: "1rem",
};

const STYLE_OPTIONS: DividerStyle[] = ["solid", "dashed", "dotted"];
const ORIENTATION_OPTIONS: DividerOrientation[] = ["horizontal", "vertical"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-[11px] text-muted-foreground">
      <span className="font-mono uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

function controlClassName(): string {
  return "rounded border border-border bg-background px-2.5 py-2 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring";
}

export function DividerElementDevClient() {
  const [block, setBlock] = useState<DividerBlock>(DEFAULT_DIVIDER);

  const exportJson = useMemo(
    () =>
      JSON.stringify(
        { divider: { defaultVariant: "default", variants: { default: block } } },
        null,
        2
      ),
    [block]
  );

  const patchBlock = (patch: Partial<DividerBlock>) => {
    setBlock((prev) => ({ ...prev, ...patch }));
  };

  return (
    <DevWorkbenchPageShell
      nav={<DevWorkbenchNav onResetSection={() => setBlock(DEFAULT_DIVIDER)} />}
    >
      <div className="mb-6 space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Element Workbench
        </p>
        <h1 className="text-2xl font-semibold tracking-normal">Divider</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Tune the baseline divider shape and export the workbench payload.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(17.5rem,24rem)]">
        <section className="space-y-5">
          <div className="rounded-lg border border-border bg-card/20 p-4">
            <div className="grid min-h-64 place-items-center rounded border border-dashed border-border/70 bg-background/60 p-8">
              <div className="w-full max-w-xl">
                <ElementRenderer block={block} />
              </div>
            </div>
          </div>

          <section className="rounded-lg border border-border bg-card/20 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                Controls
              </p>
              <button
                type="button"
                onClick={() => setBlock(DEFAULT_DIVIDER)}
                className="rounded border border-border px-3 py-1.5 text-[11px] font-mono text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                Reset
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Orientation">
                <select
                  value={block.orientation}
                  onChange={(event) =>
                    patchBlock({ orientation: event.target.value as DividerOrientation })
                  }
                  className={controlClassName()}
                >
                  {ORIENTATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Style">
                <select
                  value={block.style}
                  onChange={(event) => patchBlock({ style: event.target.value as DividerStyle })}
                  className={controlClassName()}
                >
                  {STYLE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Thickness">
                <input
                  value={block.thickness}
                  onChange={(event) => patchBlock({ thickness: event.target.value })}
                  className={controlClassName()}
                />
              </Field>
              <Field label="Length">
                <input
                  value={typeof block.length === "string" ? block.length : "100%"}
                  onChange={(event) => patchBlock({ length: event.target.value })}
                  className={controlClassName()}
                />
              </Field>
              <Field label="Color">
                <input
                  value={themeStringToInputValue(block.color)}
                  onChange={(event) => patchBlock({ color: event.target.value })}
                  className={controlClassName()}
                />
              </Field>
              <Field label="Margin">
                <input
                  value={`${block.marginTop ?? ""} / ${block.marginBottom ?? ""}`}
                  onChange={(event) => {
                    const [marginTop = "", marginBottom = marginTop] = event.target.value
                      .split("/")
                      .map((part) => part.trim());
                    patchBlock({ marginTop, marginBottom });
                  }}
                  className={controlClassName()}
                />
              </Field>
            </div>
          </section>
        </section>

        <aside className="space-y-4 rounded-lg border border-border bg-card/20 p-4">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Export
          </p>
          <pre className="max-h-136 overflow-auto rounded border border-border bg-background p-3 text-[11px] leading-5 text-muted-foreground">
            {exportJson}
          </pre>
        </aside>
      </div>
    </DevWorkbenchPageShell>
  );
}

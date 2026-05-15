"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { ElementBlock } from "@pb/contracts";
import { ElementRenderer } from "@pb/runtime-react/client";
import { DevWorkbenchNav } from "@/app/dev/_components/DevWorkbenchNav";
import { DevWorkbenchPageShell } from "@/app/dev/_components/DevWorkbenchPageShell";

type GroupBlock = Extract<ElementBlock, { type: "elementGroup" }>;

const DIRECTION_OPTIONS: NonNullable<CSSProperties["flexDirection"]>[] = ["row", "column"];
const ALIGN_OPTIONS: NonNullable<CSSProperties["alignItems"]>[] = [
  "flex-start",
  "center",
  "flex-end",
  "stretch",
];
const JUSTIFY_OPTIONS: NonNullable<CSSProperties["justifyContent"]>[] = [
  "flex-start",
  "center",
  "flex-end",
  "space-between",
];
const WRAP_OPTIONS: NonNullable<GroupBlock["flexWrap"]>[] = ["nowrap", "wrap", "wrap-reverse"];

function createGroupBlock(overrides: Partial<GroupBlock> = {}): GroupBlock {
  return {
    type: "elementGroup",
    width: "100%",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    flexWrap: "wrap",
    padding: "1rem",
    borderRadius: "0.5rem",
    wrapperStyle: {
      border: "1px solid rgba(255,255,255,0.18)",
      background: "rgba(255,255,255,0.04)",
    },
    section: {
      elementOrder: ["heading", "body", "button"],
      definitions: {
        heading: {
          type: "elementHeading",
          text: "Nested stack",
          level: 3,
          variant: "section",
          width: "14rem",
        },
        body: {
          type: "elementBody",
          text: "Group layout keeps local element rhythm together.",
          level: 4,
          width: "18rem",
        },
        button: {
          type: "elementButton",
          label: "Action",
          variant: "ghost",
        },
      },
    },
    ...overrides,
  };
}

const DEFAULT_GROUP = createGroupBlock();

function Field({ label, children }: { label: string; children: ReactNode }) {
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

export function GroupElementDevClient() {
  const [block, setBlock] = useState<GroupBlock>(DEFAULT_GROUP);
  const exportJson = useMemo(
    () =>
      JSON.stringify(
        { group: { defaultVariant: "default", variants: { default: block } } },
        null,
        2
      ),
    [block]
  );

  const patchBlock = (patch: Partial<GroupBlock>) => {
    setBlock((prev) => ({ ...prev, ...patch }));
  };

  return (
    <DevWorkbenchPageShell nav={<DevWorkbenchNav onResetSection={() => setBlock(DEFAULT_GROUP)} />}>
      <div className="mb-6 space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Element Workbench
        </p>
        <h1 className="text-2xl font-semibold tracking-normal">Group</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Tune the layout wrapper that renders nested element definitions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(17.5rem,24rem)]">
        <section className="space-y-5">
          <div className="rounded-lg border border-border bg-card/20 p-4">
            <div className="rounded border border-dashed border-border/70 bg-background/60 p-6">
              <ElementRenderer block={block} />
            </div>
          </div>

          <section className="rounded-lg border border-border bg-card/20 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                Layout Controls
              </p>
              <button
                type="button"
                onClick={() => setBlock(DEFAULT_GROUP)}
                className="rounded border border-border px-3 py-1.5 text-[11px] font-mono text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                Reset
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Direction">
                <select
                  value={block.flexDirection}
                  onChange={(event) => patchBlock({ flexDirection: event.target.value })}
                  className={controlClassName()}
                >
                  {DIRECTION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Alignment">
                <select
                  value={block.alignItems}
                  onChange={(event) => patchBlock({ alignItems: event.target.value })}
                  className={controlClassName()}
                >
                  {ALIGN_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Justify">
                <select
                  value={block.justifyContent}
                  onChange={(event) => patchBlock({ justifyContent: event.target.value })}
                  className={controlClassName()}
                >
                  {JUSTIFY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Wrap">
                <select
                  value={block.flexWrap}
                  onChange={(event) =>
                    patchBlock({ flexWrap: event.target.value as GroupBlock["flexWrap"] })
                  }
                  className={controlClassName()}
                >
                  {WRAP_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Gap">
                <input
                  value={typeof block.gap === "string" ? block.gap : ""}
                  onChange={(event) => patchBlock({ gap: event.target.value })}
                  className={controlClassName()}
                />
              </Field>
              <Field label="Padding">
                <input
                  value={typeof block.padding === "string" ? block.padding : ""}
                  onChange={(event) => patchBlock({ padding: event.target.value })}
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
          <pre className="max-h-[34rem] overflow-auto rounded border border-border bg-background p-3 text-[11px] leading-5 text-muted-foreground">
            {exportJson}
          </pre>
        </aside>
      </div>
    </DevWorkbenchPageShell>
  );
}

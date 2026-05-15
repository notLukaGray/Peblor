import type { Dispatch, SetStateAction } from "react";
import {
  LayoutNumberField,
  LayoutSelectField,
  LayoutTextField,
} from "@/app/dev/layout/_shared/layout-control-fields";
import type { LayoutColumnsDraft } from "./layout-columns-dev-state";

function toFiniteInt(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.round(parsed);
}

type Props = {
  draft: LayoutColumnsDraft;
  setDraft: Dispatch<SetStateAction<LayoutColumnsDraft>>;
};

export function LayoutColumnsControlsPanel({ draft, setDraft }: Props) {
  return (
    <>
      <section className="space-y-3 rounded-lg border border-border bg-card/20 p-4">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Column behavior
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <LayoutNumberField
            label="Items"
            min={1}
            max={24}
            value={draft.itemCount}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                itemCount: toFiniteInt(event.target.value, prev.itemCount),
              }))
            }
          />
          <LayoutNumberField
            label="Desktop columns"
            min={1}
            max={12}
            value={draft.desktopColumns}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                desktopColumns: toFiniteInt(event.target.value, prev.desktopColumns),
              }))
            }
          />
          <LayoutNumberField
            label="Mobile columns"
            min={1}
            max={12}
            value={draft.mobileColumns}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                mobileColumns: toFiniteInt(event.target.value, prev.mobileColumns),
              }))
            }
          />
          <LayoutSelectField
            label="Desktop mode"
            value={draft.desktopGridMode}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                desktopGridMode: event.target.value as LayoutColumnsDraft["desktopGridMode"],
              }))
            }
            options={["columns", "grid"]}
          />
          <LayoutSelectField
            label="Mobile mode"
            value={draft.mobileGridMode}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                mobileGridMode: event.target.value as LayoutColumnsDraft["mobileGridMode"],
              }))
            }
            options={["columns", "grid"]}
          />
          <LayoutTextField
            label="Desktop spans"
            className="space-y-1.5 sm:col-span-2"
            value={draft.desktopSpanPattern}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, desktopSpanPattern: event.target.value }))
            }
            placeholder="1,1,2,1"
          />
          <LayoutTextField
            label="Mobile spans"
            className="space-y-1.5 sm:col-span-2"
            value={draft.mobileSpanPattern}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, mobileSpanPattern: event.target.value }))
            }
            placeholder="1"
          />
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card/20 p-4">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Spacing and sizing
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <LayoutTextField
            label="Desktop gap"
            value={draft.desktopGap}
            onChange={(event) => setDraft((prev) => ({ ...prev, desktopGap: event.target.value }))}
            placeholder="1rem"
          />
          <LayoutTextField
            label="Mobile gap"
            value={draft.mobileGap}
            onChange={(event) => setDraft((prev) => ({ ...prev, mobileGap: event.target.value }))}
            placeholder="0.75rem"
          />
          <LayoutTextField
            label="Content width"
            value={draft.contentWidth}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, contentWidth: event.target.value }))
            }
            placeholder="hug"
          />
          <LayoutTextField
            label="Content height"
            value={draft.contentHeight}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, contentHeight: event.target.value }))
            }
            placeholder="hug"
          />
          <LayoutTextField
            label="Item min height"
            value={draft.itemMinHeight}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, itemMinHeight: event.target.value }))
            }
            placeholder="5.5rem"
          />
          <LayoutSelectField
            label="Section align"
            className="space-y-1.5 sm:col-span-2"
            value={draft.align}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                align: event.target.value as LayoutColumnsDraft["align"],
              }))
            }
            options={["left", "center", "right", "full"]}
          />
        </div>
      </section>
    </>
  );
}

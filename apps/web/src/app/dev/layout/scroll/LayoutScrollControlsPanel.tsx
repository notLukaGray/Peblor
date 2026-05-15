import type { Dispatch, SetStateAction } from "react";
import {
  LayoutNumberField,
  LayoutSelectField,
  LayoutTextField,
} from "@/app/dev/layout/_shared/layout-control-fields";
import type { LayoutScrollDraft } from "./layout-scroll-dev-state";

function toFiniteNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type Props = {
  draft: LayoutScrollDraft;
  setDraft: Dispatch<SetStateAction<LayoutScrollDraft>>;
};

export function LayoutScrollControlsPanel({ draft, setDraft }: Props) {
  return (
    <>
      <section className="space-y-3 rounded-lg border border-border bg-card/20 p-4">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Container
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <LayoutSelectField
            label="Scroll direction"
            value={draft.scrollDirection}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                scrollDirection: event.target.value as LayoutScrollDraft["scrollDirection"],
              }))
            }
            options={["horizontal", "vertical"]}
          />
          <LayoutSelectField
            label="Section align"
            value={draft.align}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                align: event.target.value as LayoutScrollDraft["align"],
              }))
            }
            options={["left", "center", "right", "full"]}
          />
          <LayoutNumberField
            label="Items"
            min={1}
            max={24}
            value={draft.itemCount}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                itemCount: toFiniteNumber(event.target.value, prev.itemCount),
              }))
            }
          />
          <LayoutTextField
            label="Width"
            value={draft.width}
            onChange={(event) => setDraft((prev) => ({ ...prev, width: event.target.value }))}
            placeholder="100%"
          />
          <LayoutTextField
            label="Min height"
            value={draft.minHeight}
            onChange={(event) => setDraft((prev) => ({ ...prev, minHeight: event.target.value }))}
            placeholder="22rem"
          />
          <LayoutTextField
            label="Item width (horizontal)"
            value={draft.itemWidth}
            onChange={(event) => setDraft((prev) => ({ ...prev, itemWidth: event.target.value }))}
            placeholder="20rem"
          />
          <LayoutTextField
            label="Item min height"
            value={draft.itemHeight}
            onChange={(event) => setDraft((prev) => ({ ...prev, itemHeight: event.target.value }))}
            placeholder="12rem"
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          Use chunky card sizes so horizontal or vertical overflow is obvious in the preview.
        </p>
      </section>
    </>
  );
}

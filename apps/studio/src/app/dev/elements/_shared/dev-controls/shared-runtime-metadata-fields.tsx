import type { ReactNode } from "react";
import { INTERACTION_CURSOR_OPTIONS, VISIBLE_WHEN_OPERATOR_OPTIONS } from "./foundation-constants";
import type { ElementDevRuntimeDraft } from "./runtime-draft-types";
import { RuntimeAdvancedPassthroughFields } from "./runtime-advanced-passthrough-fields";

type Props = {
  draft: ElementDevRuntimeDraft;
  setDraft: (patch: Partial<ElementDevRuntimeDraft>) => void;
  visibleWhenMatches: boolean;
  intro?: ReactNode;
};

export function SharedRuntimeMetadataFields({ draft, setDraft, visibleWhenMatches, intro }: Props) {
  return (
    <>
      {intro}
      <RuntimeLinkSimpleFields draft={draft} setDraft={setDraft} />
      <RuntimeVisibleWhenFields
        draft={draft}
        setDraft={setDraft}
        visibleWhenMatches={visibleWhenMatches}
      />
      <RuntimeWrapperMetadataFields draft={draft} setDraft={setDraft} />
      <RuntimeAdvancedPassthroughFields draft={draft} setDraft={setDraft} />
    </>
  );
}

export function RuntimeLinkSimpleFields({
  draft,
  setDraft,
}: {
  draft: ElementDevRuntimeDraft;
  setDraft: (patch: Partial<ElementDevRuntimeDraft>) => void;
}) {
  return (
    <div className="sm:col-span-2 rounded border border-border/60 bg-background/60 p-3 space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        Link (simple)
      </p>
      <p className="text-[10px] text-muted-foreground">
        elementSimpleLinkSchema: ref + external. Graphic and element-native links use other content
        shapes.
      </p>
      <label className="inline-flex items-center gap-2 text-[11px] text-foreground">
        <input
          type="checkbox"
          checked={draft.linkEnabled}
          onChange={(e) => setDraft({ linkEnabled: e.target.checked })}
        />
        Enable link
      </label>
      {draft.linkEnabled ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1.5 sm:col-span-2">
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Link ref / href
            </span>
            <input
              type="text"
              value={draft.linkRef}
              onChange={(e) => setDraft({ linkRef: e.target.value })}
              placeholder="e.g. /work/case-study or https://example.com"
              className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
            />
          </label>
          <label className="inline-flex items-center gap-2 text-[11px] text-foreground">
            <input
              type="checkbox"
              checked={draft.linkExternal}
              onChange={(e) => setDraft({ linkExternal: e.target.checked })}
            />
            External link
          </label>
        </div>
      ) : null}
    </div>
  );
}

export function RuntimeVisibleWhenFields({
  draft,
  setDraft,
  visibleWhenMatches,
}: {
  draft: ElementDevRuntimeDraft;
  setDraft: (patch: Partial<ElementDevRuntimeDraft>) => void;
  visibleWhenMatches: boolean;
}) {
  return (
    <div className="sm:col-span-2 rounded border border-border/60 bg-background/60 p-3 space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        Visibility
      </p>
      <label className="inline-flex items-center gap-2 text-[11px] text-foreground">
        <input
          type="checkbox"
          checked={draft.visibleWhenEnabled}
          onChange={(e) => setDraft({ visibleWhenEnabled: e.target.checked })}
        />
        Simulate visibleWhen in preview
      </label>
      {draft.visibleWhenEnabled ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Variable
            </span>
            <input
              type="text"
              value={draft.visibleWhenVariable}
              onChange={(e) => setDraft({ visibleWhenVariable: e.target.value })}
              placeholder="e.g. userTier"
              className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
            />
          </label>
          <label className="space-y-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Operator
            </span>
            <select
              value={draft.visibleWhenOperator}
              onChange={(e) =>
                setDraft({
                  visibleWhenOperator: e.target.value as typeof draft.visibleWhenOperator,
                })
              }
              className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
            >
              {VISIBLE_WHEN_OPERATOR_OPTIONS.map((operator) => (
                <option key={operator} value={operator}>
                  {operator}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Expected value
            </span>
            <input
              type="text"
              value={draft.visibleWhenValue}
              onChange={(e) => setDraft({ visibleWhenValue: e.target.value })}
              placeholder='e.g. "pro" or 2'
              className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
            />
          </label>
          <label className="space-y-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Preview value
            </span>
            <input
              type="text"
              value={draft.visibleWhenPreviewValue}
              onChange={(e) => setDraft({ visibleWhenPreviewValue: e.target.value })}
              placeholder='e.g. "basic" or 3'
              className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
            />
          </label>
          <p className="sm:col-span-2 text-[10px] text-muted-foreground">
            Preview status: {visibleWhenMatches ? "visible" : "hidden by visibleWhen"}.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function RuntimeWrapperMetadataFields({
  draft,
  setDraft,
}: {
  draft: ElementDevRuntimeDraft;
  setDraft: (patch: Partial<ElementDevRuntimeDraft>) => void;
}) {
  return (
    <div className="sm:col-span-2 rounded border border-border/60 bg-background/60 p-3 space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        Metadata + Wrapper
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Aria label
          </span>
          <input
            type="text"
            value={draft.ariaLabel}
            onChange={(e) => setDraft({ ariaLabel: e.target.value })}
            placeholder="e.g. Product hero image"
            className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          />
        </label>
        <label className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Cursor
          </span>
          <select
            value={draft.cursor}
            onChange={(e) => setDraft({ cursor: e.target.value as typeof draft.cursor })}
            className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          >
            {INTERACTION_CURSOR_OPTIONS.map((cursor) => (
              <option key={cursor || "none"} value={cursor}>
                {cursor || "inherit"}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2 space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Wrapper style JSON
          </span>
          <textarea
            value={draft.wrapperStyleJson}
            onChange={(e) => setDraft({ wrapperStyleJson: e.target.value })}
            placeholder='e.g. {"outline":"2px solid rgba(255,255,255,0.35)"}'
            className="min-h-[5.5rem] w-full rounded border border-border bg-background p-3 font-mono text-[11px] text-foreground"
          />
        </label>
      </div>
    </div>
  );
}

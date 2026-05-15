import type { RichTextVariantDefaults } from "../types";
import type { RichTextElementDevController } from "../useRichTextElementDevController";

const LEVELS = [1, 2, 3, 4, 5, 6] as const;

function levelToSelectValue(level: RichTextVariantDefaults["level"]): string {
  if (level === undefined || level === null) return "";
  if (Array.isArray(level)) return String(level[1]);
  return String(level);
}

export function RichTextContentControls({
  controller,
}: {
  controller: RichTextElementDevController;
}) {
  const { active, activeVariant, setVariantPatch } = controller;

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Content
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Markdown content, optional HTML markup override, and typography level for
          <code>elementRichText</code>.
        </p>
      </div>

      <label className="space-y-1.5 sm:col-span-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Markdown content
        </span>
        <textarea
          className="min-h-[7rem] w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.content}
          onChange={(e) => setVariantPatch(activeVariant, { content: e.target.value })}
        />
      </label>

      <label className="space-y-1.5 sm:col-span-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          HTML markup (optional)
        </span>
        <textarea
          className="min-h-[6rem] w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.markup ?? ""}
          onChange={(e) =>
            setVariantPatch(activeVariant, {
              markup: e.target.value.trim().length > 0 ? e.target.value : undefined,
            })
          }
          placeholder="<p>Optional sanitized HTML override...</p>"
        />
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Typography level
        </span>
        <select
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={levelToSelectValue(active.level)}
          onChange={(e) => {
            const value = e.target.value;
            setVariantPatch(activeVariant, {
              level: value === "" ? undefined : (Number(value) as RichTextVariantDefaults["level"]),
            });
          }}
        >
          <option value="">Unset (no body variant class)</option>
          {LEVELS.map((lv) => (
            <option key={lv} value={lv}>
              Level {lv}
            </option>
          ))}
        </select>
      </label>

      <label className="inline-flex items-center gap-2 rounded border border-border/60 bg-background/60 px-3 py-2 text-[11px] text-foreground sm:col-span-2">
        <input
          type="checkbox"
          checked={active.wordWrap !== false}
          onChange={(e) => setVariantPatch(activeVariant, { wordWrap: e.target.checked })}
        />
        Word wrap
      </label>
    </>
  );
}

import {
  SharedFontSlotField,
  SharedWorkbenchColorTokenFields,
} from "@/app/dev/elements/_shared/dev-controls";
import type { BodyVariantDefaults } from "../types";
import type { BodyElementDevController } from "../useBodyElementDevController";

const LEVELS = [1, 2, 3, 4, 5, 6] as const;

function levelToSelectValue(level: BodyVariantDefaults["level"]): string {
  if (level === undefined || level === null) return "";
  if (Array.isArray(level)) return String(level[1]);
  return String(level);
}

export function BodyContentControls({ controller }: { controller: BodyElementDevController }) {
  const { active, activeVariant, setVariantPatch } = controller;

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Content
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Body copy, typography level, color (from `/dev/colors` tokens), and line height. Maps to
          `elementBody` content fields. Supports inline formatting with `**bold**`, `*italic*`,
          `~~strike~~`, inline code, links, and line breaks via Enter or `\n`.
        </p>
      </div>

      <label className="space-y-1.5 sm:col-span-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Text
        </span>
        <textarea
          className="min-h-[4.5rem] w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.text}
          onChange={(e) => setVariantPatch(activeVariant, { text: e.target.value })}
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
            const v = e.target.value;
            setVariantPatch(activeVariant, {
              level: v === "" ? undefined : (Number(v) as BodyVariantDefaults["level"]),
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

      <SharedWorkbenchColorTokenFields
        idSuffix={`body-${activeVariant}`}
        label="Color"
        value={active.color}
        onChange={(next) => setVariantPatch(activeVariant, { color: next })}
        helperText="Tokens resolve against the current workbench session from `/dev/colors`. Use custom CSS for literals or other vars."
      />

      <label className="space-y-1.5 sm:col-span-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Line height
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.lineHeight === undefined ? "" : String(active.lineHeight)}
          onChange={(e) =>
            setVariantPatch(activeVariant, { lineHeight: e.target.value || undefined })
          }
          placeholder="e.g. 1.5 or 1.5rem"
        />
      </label>

      <SharedFontSlotField
        idSuffix={`body-${activeVariant}`}
        value={active.fontFamily}
        onChange={(value) => setVariantPatch(activeVariant, { fontFamily: value })}
      />

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

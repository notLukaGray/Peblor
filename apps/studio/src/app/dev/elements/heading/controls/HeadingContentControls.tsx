import {
  SharedFontSlotField,
  SharedWorkbenchColorTokenFields,
} from "@/app/dev/elements/_shared/dev-controls";
import type { HeadingVariantDefaults } from "../types";
import type { HeadingElementDevController } from "../useHeadingElementDevController";

const LEVELS = [1, 2, 3, 4, 5, 6] as const;

export function HeadingContentControls({
  controller,
}: {
  controller: HeadingElementDevController;
}) {
  const { active, activeVariant, setVariantPatch } = controller;

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Content
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Heading level, semantic outline, copy, and color (from `/dev/colors` tokens). Maps to
          `elementHeading` content fields. Supports inline formatting with `**bold**`, `*italic*`,
          `~~strike~~`, inline code, links, and line breaks via Enter or `\n`.
        </p>
      </div>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Style level
        </span>
        <select
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.level}
          onChange={(e) =>
            setVariantPatch(activeVariant, {
              level: Number(e.target.value) as HeadingVariantDefaults["level"],
            })
          }
        >
          {LEVELS.map((lv) => (
            <option key={lv} value={lv}>
              h{lv}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Semantic level
        </span>
        <select
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.semanticLevel ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            setVariantPatch(activeVariant, {
              semanticLevel:
                v === "" ? undefined : (Number(v) as HeadingVariantDefaults["semanticLevel"]),
            });
          }}
        >
          <option value="">Same as style (outline follows style level)</option>
          {LEVELS.map((lv) => (
            <option key={`sem-${lv}`} value={lv}>
              h{lv} (document outline)
            </option>
          ))}
        </select>
      </label>

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

      <SharedFontSlotField
        idSuffix={`heading-${activeVariant}`}
        value={active.fontFamily}
        onChange={(value) => setVariantPatch(activeVariant, { fontFamily: value })}
      />

      <SharedWorkbenchColorTokenFields
        idSuffix={`heading-${activeVariant}`}
        label="Color"
        value={active.color}
        onChange={(next) => setVariantPatch(activeVariant, { color: next })}
        helperText="Tokens resolve against the current workbench session from `/dev/colors`."
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

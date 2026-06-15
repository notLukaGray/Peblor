import {
  SharedFontSlotField,
  SharedWorkbenchPaintTokenFields,
  WORKBENCH_BUTTON_FILL_TOKEN_OPTIONS,
  WORKBENCH_BUTTON_STROKE_TOKEN_OPTIONS,
} from "@/app/dev/elements/_shared/dev-controls";
import type { ButtonVariantDefaults } from "../types";
import type { ButtonElementDevController } from "../useButtonElementDevController";

const LEVELS = [1, 2, 3, 4, 5, 6] as const;

type OptionalStringKey = "label" | "wrapperFill" | "wrapperStroke";

function normalizeOptionalText(value: string): string | undefined {
  return value.trim().length > 0 ? value : undefined;
}

function fieldValue(value: string | undefined): string {
  return value ?? "";
}

export function ButtonContentControls({ controller }: { controller: ButtonElementDevController }) {
  const { active, activeVariant, setVariantPatch } = controller;
  const setOptionalField = (key: OptionalStringKey, value: string) => {
    setVariantPatch(activeVariant, { [key]: normalizeOptionalText(value) });
  };

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Content
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Label, typography, and wrapper fill/stroke. Fill/stroke presets mirror the{" "}
          <code>/dev/colors</code> preview column (Primary / Accent / Ghost). Padding, radius, and
          sizing live under <span className="font-mono">Layout</span>. Href, action, link ink, and
          hover states live under <span className="font-mono">Interaction</span>.
        </p>
      </div>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Label
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={fieldValue(active.label)}
          onChange={(e) => setOptionalField("label", e.target.value)}
        />
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Copy type
        </span>
        <select
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.copyType ?? "body"}
          onChange={(e) =>
            setVariantPatch(activeVariant, {
              copyType: e.target.value as ButtonVariantDefaults["copyType"],
            })
          }
        >
          <option value="body">Body</option>
          <option value="heading">Heading</option>
        </select>
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Level
        </span>
        <select
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.level ?? 4}
          onChange={(e) =>
            setVariantPatch(activeVariant, {
              level: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6,
            })
          }
        >
          {LEVELS.map((lv) => (
            <option key={lv} value={lv}>
              Level {lv}
            </option>
          ))}
        </select>
      </label>

      <SharedFontSlotField
        idSuffix="button-font-family"
        value={active.fontFamily}
        onChange={(value) => setVariantPatch(activeVariant, { fontFamily: value })}
      />

      <label className="inline-flex items-center gap-2 rounded border border-border/60 bg-background/60 px-3 py-2 text-[11px] text-foreground sm:col-span-2">
        <input
          type="checkbox"
          checked={active.wordWrap === true}
          onChange={(e) => setVariantPatch(activeVariant, { wordWrap: e.target.checked })}
        />
        Word wrap
      </label>

      <SharedWorkbenchPaintTokenFields
        idSuffix={`btn-${activeVariant}-fill`}
        label="Wrapper fill"
        options={WORKBENCH_BUTTON_FILL_TOKEN_OPTIONS}
        value={active.wrapperFill}
        onChange={(next) => setVariantPatch(activeVariant, { wrapperFill: next })}
        helperText="Maps to wrapper background. Presets match the /dev/colors component preview chips."
      />

      <SharedWorkbenchPaintTokenFields
        idSuffix={`btn-${activeVariant}-stroke`}
        label="Wrapper stroke"
        options={WORKBENCH_BUTTON_STROKE_TOKEN_OPTIONS}
        value={active.wrapperStroke}
        onChange={(next) => setVariantPatch(activeVariant, { wrapperStroke: next })}
        helperText="Border color when the wrapper draws a stroke (ghost / outlined buttons)."
      />
    </>
  );
}

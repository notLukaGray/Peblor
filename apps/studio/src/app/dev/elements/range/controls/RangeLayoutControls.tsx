import {
  SharedFoundationLayoutFields,
  SharedWorkbenchColorTokenFields,
} from "@/app/dev/elements/_shared/dev-controls";
import type { RangeVariantDefaults } from "../types";
import type { RangeElementDevController } from "../useRangeElementDevController";

type RangeStyleField = keyof NonNullable<RangeVariantDefaults["style"]>;

type RangeStyleFieldConfig = {
  field: RangeStyleField;
  label: string;
  placeholder: string;
};

const RANGE_GEOMETRY_STYLE_FIELD_CONFIGS: RangeStyleFieldConfig[] = [
  { field: "trackHeight", label: "Track Height", placeholder: "4px" },
  { field: "thumbSize", label: "Thumb Size", placeholder: "14px" },
  { field: "borderRadius", label: "Border Radius", placeholder: "9999px" },
];

type RangeStyleFieldInputProps = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
};

function RangeStyleFieldInput({ label, placeholder, value, onChange }: RangeStyleFieldInputProps) {
  return (
    <div className="space-y-2">
      <label className="block font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder={placeholder}
      />
    </div>
  );
}

function buildRangeStylePatch(
  style: RangeVariantDefaults["style"] | undefined,
  field: RangeStyleField,
  value: string
): RangeVariantDefaults["style"] | undefined {
  const nextStyle = { ...(style ?? {}) } as Record<string, string | number>;
  if (value.trim().length === 0) delete nextStyle[field];
  else nextStyle[field] = value;
  return Object.keys(nextStyle).length > 0
    ? (nextStyle as RangeVariantDefaults["style"])
    : undefined;
}

function readRangeStyleFieldValue(
  style: RangeVariantDefaults["style"] | undefined,
  field: RangeStyleField
): string {
  const value = style?.[field];
  return value === undefined ? "" : String(value);
}

export function RangeLayoutControls({ controller }: { controller: RangeElementDevController }) {
  const { active, activeVariant, setVariantPatch } = controller;

  const patchStyle = (field: RangeStyleField, value: string | undefined) => {
    setVariantPatch(activeVariant, {
      style: buildRangeStylePatch(active.style, field, value ?? ""),
    });
  };

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Layout
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Track/fill use workbench <code className="font-mono">--pb-*</code> tokens so the Light
          preview scenario matches <code className="font-mono">/dev/colors</code>. Geometry fields
          accept any CSS length.
        </p>
      </div>

      <SharedWorkbenchColorTokenFields
        idSuffix={`range-track-${activeVariant}`}
        label="Track color"
        value={readRangeStyleFieldValue(active.style, "trackColor") || undefined}
        onChange={(next) => patchStyle("trackColor", next)}
        helperText="Default seed is a soft mix of text ink—dark track on a light surface, light track on dark. Override with a token or custom CSS (e.g. color-mix with var(--pb-border))."
      />

      <SharedWorkbenchColorTokenFields
        idSuffix={`range-fill-${activeVariant}`}
        label="Fill color"
        value={readRangeStyleFieldValue(active.style, "fillColor") || undefined}
        onChange={(next) => patchStyle("fillColor", next)}
        helperText="Thumb fill / progress color. Same token picker as track; use Brand · accent for emphasis variants."
      />

      {RANGE_GEOMETRY_STYLE_FIELD_CONFIGS.map((config) => (
        <RangeStyleFieldInput
          key={config.field}
          label={config.label}
          placeholder={config.placeholder}
          value={readRangeStyleFieldValue(active.style, config.field)}
          onChange={(next) => patchStyle(config.field, next)}
        />
      ))}

      <SharedFoundationLayoutFields<RangeVariantDefaults>
        variant={active}
        onPatch={(patch) => setVariantPatch(activeVariant, patch)}
      />
    </>
  );
}

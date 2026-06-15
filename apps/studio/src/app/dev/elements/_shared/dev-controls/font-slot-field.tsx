import type { FontSlotName } from "@pb/runtime-react/dev-core";

/** Values stored in element JSON (`fontFamily`); empty string clears the override. */
export const FONT_SLOT_SELECT_ORDER = ["", "primary", "secondary", "mono"] as const;

export type FontSlotSelectValue = (typeof FONT_SLOT_SELECT_ORDER)[number];

const FONT_SLOT_LABELS: Record<FontSlotSelectValue, string> = {
  "": "Default (theme)",
  primary: "Primary",
  secondary: "Secondary",
  mono: "Mono",
};

function isFontSlotName(value: string): value is FontSlotName {
  return value === "primary" || value === "secondary" || value === "mono";
}

/**
 * Select a named typeface slot (`primary` / `secondary` / `mono`) or leave unset so typography follows the theme.
 */
export function SharedFontSlotField({
  idSuffix,
  value,
  onChange,
}: {
  idSuffix: string;
  value: string | undefined;
  onChange: (next: string | undefined) => void;
}) {
  const selectValue: FontSlotSelectValue =
    value === undefined || value === "" ? "" : isFontSlotName(value) ? value : "";

  return (
    <label className="space-y-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        Typeface
      </span>
      <select
        id={`font-slot-${idSuffix}`}
        className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value as FontSlotSelectValue;
          onChange(v === "" ? undefined : v);
        }}
      >
        {FONT_SLOT_SELECT_ORDER.map((key) => (
          <option key={key || "default"} value={key}>
            {FONT_SLOT_LABELS[key]}
          </option>
        ))}
      </select>
      {value !== undefined && value !== "" && !isFontSlotName(value) ? (
        <p className="text-[10px] text-muted-foreground">
          Custom <code className="font-mono">fontFamily</code> is set via JSON:{" "}
          <code className="font-mono">{value}</code>
        </p>
      ) : (
        <p className="text-[10px] text-muted-foreground">
          Named slots use theme variables (<code className="font-mono">--font-primary</code>, etc.).
          Other strings are passed through as raw CSS.
        </p>
      )}
    </label>
  );
}

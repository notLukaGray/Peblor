/**
 * Token presets aligned with `color-tool-preview-helpers` (`/dev/colors` bottom preview column).
 * Values are CSS `background` / `border-color` strings (usually `var(--pb-*)`).
 */
import {
  themeStringToInputValue,
  type ThemeStringLike,
} from "@/app/dev/elements/_shared/theme-string";

export type WorkbenchPaintTokenOption = { value: string; label: string };

/** Solid fills shown next to “Primary” / “Accent” preview chips. */
export const WORKBENCH_BUTTON_FILL_TOKEN_OPTIONS: WorkbenchPaintTokenOption[] = [
  { value: "", label: "None" },
  { value: "var(--pb-primary)", label: "Primary" },
  { value: "var(--pb-secondary)", label: "Secondary" },
  { value: "var(--pb-accent)", label: "Accent" },
  { value: "var(--pb-surface-root)", label: "Surface root" },
  { value: "var(--pb-surface-muted)", label: "Surface muted" },
  { value: "var(--pb-surface-raised)", label: "Surface raised" },
  { value: "transparent", label: "Transparent" },
];

/** Strokes / outlines (ghost-style uses on-secondary on the color preview surface). */
export const WORKBENCH_BUTTON_STROKE_TOKEN_OPTIONS: WorkbenchPaintTokenOption[] = [
  { value: "", label: "None" },
  { value: "var(--pb-border)", label: "Border" },
  { value: "var(--pb-border-strong)", label: "Border strong" },
  { value: "var(--pb-primary)", label: "Primary" },
  { value: "var(--pb-secondary)", label: "Secondary" },
  { value: "var(--pb-accent)", label: "Accent" },
  { value: "var(--pb-on-secondary)", label: "On secondary (ghost outline)" },
];

function selectValueForToken(
  value: string | undefined,
  options: readonly WorkbenchPaintTokenOption[]
): string {
  const raw = value ?? "";
  const allowed = new Set(options.map((o) => o.value));
  return allowed.has(raw) ? raw : "";
}

export function SharedWorkbenchPaintTokenFields({
  idSuffix,
  label,
  options,
  value,
  onChange,
  helperText,
  customPlaceholder,
}: {
  idSuffix: string;
  label: string;
  options: readonly WorkbenchPaintTokenOption[];
  value: ThemeStringLike | undefined;
  onChange: (next: string | undefined) => void;
  helperText?: string;
  customPlaceholder?: string;
}) {
  const cssValue = themeStringToInputValue(value);
  const selectValue = selectValueForToken(cssValue || undefined, options);

  return (
    <>
      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {label} · preset
        </span>
        <select
          id={`wb-paint-preset-${idSuffix}`}
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={selectValue}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? undefined : v);
          }}
        >
          {options.map((opt) => (
            <option key={opt.value || "none"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1.5 sm:col-span-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {label} · custom CSS
        </span>
        <input
          type="text"
          id={`wb-paint-custom-${idSuffix}`}
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={cssValue}
          onChange={(e) => onChange(e.target.value.trim() ? e.target.value : undefined)}
          placeholder={
            customPlaceholder ?? "e.g. color-mix(in oklab, var(--pb-primary) 90%, white)"
          }
        />
        {helperText ? <p className="text-[10px] text-muted-foreground">{helperText}</p> : null}
      </label>
    </>
  );
}

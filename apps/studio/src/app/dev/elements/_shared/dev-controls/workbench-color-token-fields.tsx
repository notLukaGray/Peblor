import {
  WORKBENCH_COLOR_TOKEN_SELECT_OPTIONS,
  workbenchColorTokenSelectValue,
} from "./workbench-color-token-presets";
import {
  themeStringToInputValue,
  type ThemeStringLike,
} from "@/app/dev/elements/_shared/theme-string";

export function SharedWorkbenchColorTokenFields({
  idSuffix,
  label,
  value,
  onChange,
  helperText,
}: {
  idSuffix: string;
  label: string;
  value: ThemeStringLike | undefined;
  onChange: (next: string | undefined) => void;
  helperText?: string;
}) {
  const cssValue = themeStringToInputValue(value);
  const selectValue = workbenchColorTokenSelectValue(cssValue || undefined);

  return (
    <>
      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {label} · token
        </span>
        <select
          id={`wb-color-token-${idSuffix}`}
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={selectValue}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? undefined : v);
          }}
        >
          {WORKBENCH_COLOR_TOKEN_SELECT_OPTIONS.map((opt) => (
            <option key={opt.value || "default"} value={opt.value}>
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
          id={`wb-color-custom-${idSuffix}`}
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={cssValue}
          onChange={(e) => onChange(e.target.value.trim() ? e.target.value : undefined)}
          placeholder="e.g. #0f172a or var(--pb-text-primary)"
        />
        {helperText ? <p className="text-[10px] text-muted-foreground">{helperText}</p> : null}
      </label>
    </>
  );
}

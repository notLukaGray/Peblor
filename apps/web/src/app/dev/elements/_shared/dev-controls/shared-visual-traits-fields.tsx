import { BLEND_MODE_OPTIONS, OVERFLOW_OPTIONS } from "./foundation-constants";

function clampNumber(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export type FoundationVisualTraitsShape = {
  rotate?: number | string;
  opacity?: number;
  overflow?: "hidden" | "visible" | "auto" | "scroll";
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  priority?: boolean;
  hidden?: boolean;
  blendMode?: string;
  boxShadow?: string;
  filter?: string;
  backdropFilter?: string;
};

type Props<T extends FoundationVisualTraitsShape> = {
  variant: T;
  onPatch: (patch: Partial<T>) => void;
  /** `priority` maps to image fetch priority; hide for non-media elements. Default true. */
  showPriorityLoading?: boolean;
};

function toRotateInputValue(value: FoundationVisualTraitsShape["rotate"]): string {
  return value === undefined || value === null ? "" : String(value);
}

function PriorityLoadingToggle({
  enabled,
  checked,
  onChange,
}: {
  enabled: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  if (!enabled) return null;
  return <ToggleField label="Priority loading" checked={checked} onChange={onChange} />;
}

export function SharedVisualTraitsFields<T extends FoundationVisualTraitsShape>({
  variant,
  onPatch,
  showPriorityLoading = true,
}: Props<T>) {
  return (
    <>
      <TextField
        label="Rotate"
        placeholder="e.g. 6deg"
        value={toRotateInputValue(variant.rotate)}
        onChange={(value) => onPatch({ rotate: value } as Partial<T>)}
      />
      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Opacity
        </span>
        <input
          type="number"
          min={0}
          max={1}
          step={0.01}
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={variant.opacity ?? 1}
          onChange={(e) =>
            onPatch({ opacity: clampNumber(Number(e.target.value || 1), 0, 1) } as Partial<T>)
          }
        />
      </label>
      <SelectField
        label="Overflow"
        options={OVERFLOW_OPTIONS}
        value={(variant.overflow as string | undefined) ?? "visible"}
        onChange={(value) =>
          onPatch({ overflow: value as FoundationVisualTraitsShape["overflow"] } as Partial<T>)
        }
      />
      <ToggleField
        label="Flip horizontal"
        checked={!!variant.flipHorizontal}
        onChange={(checked) => onPatch({ flipHorizontal: checked } as Partial<T>)}
      />
      <ToggleField
        label="Flip vertical"
        checked={!!variant.flipVertical}
        onChange={(checked) => onPatch({ flipVertical: checked } as Partial<T>)}
      />
      <PriorityLoadingToggle
        enabled={showPriorityLoading}
        checked={!!variant.priority}
        onChange={(checked) => onPatch({ priority: checked } as Partial<T>)}
      />
      <ToggleField
        label="Hidden by default"
        checked={!!variant.hidden}
        onChange={(checked) => onPatch({ hidden: checked } as Partial<T>)}
      />

      <details className="sm:col-span-2 rounded border border-border/60 bg-background/60 p-3">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Advanced visual traits
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <BlendModeField
            value={variant.blendMode}
            onChange={(next) => onPatch({ blendMode: next } as Partial<T>)}
          />
          <TextField
            label="Box shadow"
            placeholder="e.g. 0 12px 24px rgba(0,0,0,0.18)"
            compact
            value={variant.boxShadow ?? ""}
            onChange={(value) => onPatch({ boxShadow: value } as Partial<T>)}
          />
          <TextField
            label="Filter"
            placeholder="e.g. brightness(1.05)"
            compact
            value={variant.filter ?? ""}
            onChange={(value) => onPatch({ filter: value } as Partial<T>)}
          />
          <TextField
            label="Backdrop filter"
            placeholder="e.g. blur(10px)"
            compact
            value={variant.backdropFilter ?? ""}
            onChange={(value) => onPatch({ backdropFilter: value } as Partial<T>)}
          />
        </div>
      </details>
    </>
  );
}

function TextField({
  label,
  placeholder,
  compact = false,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  compact?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type="text"
        className={`w-full rounded border border-border bg-background ${compact ? "px-2 py-1.5" : "px-3 py-2"} font-mono text-[11px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-ring`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function SelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select
        className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function BlendModeField({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
}) {
  const rawValue = (value ?? "").trim();
  const knownOptions = BLEND_MODE_OPTIONS as readonly string[];
  const isKnown = knownOptions.includes(rawValue);
  const selectValue = isKnown ? rawValue : "__custom__";
  return (
    <label className="space-y-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        Blend mode
      </span>
      <select
        className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value;
          if (next === "__custom__") return;
          onChange(next || undefined);
        }}
      >
        <option value="">Default</option>
        {BLEND_MODE_OPTIONS.filter((opt) => opt.length > 0 && opt !== "glass").map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        <option value="__custom__">custom…</option>
      </select>
      {selectValue === "__custom__" ? (
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-ring"
          value={rawValue}
          onChange={(e) => onChange(e.target.value.trim() || undefined)}
          placeholder="custom CSS blend mode"
        />
      ) : null}
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded border border-border/60 bg-background/60 px-3 py-2 text-[11px] text-foreground">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

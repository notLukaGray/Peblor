export type FoundationConstraintFieldKey = "minWidth" | "minHeight" | "maxWidth" | "maxHeight";

export function ConstraintField({
  field,
  label,
  desktop,
  mobile,
  hasMobile,
  onDesktopChange,
  onMobileChange,
}: {
  field: FoundationConstraintFieldKey;
  label: string;
  desktop: string;
  mobile: string;
  hasMobile: boolean;
  onDesktopChange: (field: FoundationConstraintFieldKey, value: string) => void;
  onMobileChange: (field: FoundationConstraintFieldKey, value: string) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type="text"
        className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
        value={desktop}
        onChange={(e) => onDesktopChange(field, e.target.value)}
      />
      {hasMobile ? (
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={mobile}
          onChange={(e) => onMobileChange(field, e.target.value)}
          placeholder="mobile override"
        />
      ) : null}
    </label>
  );
}

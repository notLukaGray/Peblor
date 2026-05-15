export function ResponsiveTextField({
  label,
  desktopValue,
  mobileValue,
  hasMobile,
  placeholderDesktop,
  placeholderMobile = "mobile override",
  onToggleMobile,
  onDesktopChange,
  onMobileChange,
}: {
  label: string;
  desktopValue: string;
  mobileValue: string;
  hasMobile: boolean;
  placeholderDesktop: string;
  placeholderMobile?: string;
  onToggleMobile: (enabled: boolean) => void;
  onDesktopChange: (value: string) => void;
  onMobileChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <input
            type="checkbox"
            checked={hasMobile}
            onChange={(e) => onToggleMobile(e.target.checked)}
          />
          Mobile
        </span>
      </div>
      <input
        type="text"
        className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/70"
        value={desktopValue}
        onChange={(e) => onDesktopChange(e.target.value)}
        placeholder={placeholderDesktop}
      />
      {hasMobile ? (
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/70"
          value={mobileValue}
          onChange={(e) => onMobileChange(e.target.value)}
          placeholder={placeholderMobile}
        />
      ) : null}
    </label>
  );
}

export function PlainTextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type="text"
        className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/70"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "optional"}
      />
    </label>
  );
}

export function ResponsiveSelectField({
  label,
  hasMobile,
  desktopValue,
  mobileValue,
  options,
  onToggleMobile,
  onDesktopChange,
  onMobileChange,
}: {
  label: string;
  hasMobile: boolean;
  desktopValue: string;
  mobileValue: string;
  options: readonly string[];
  onToggleMobile: (enabled: boolean) => void;
  onDesktopChange: (value: string) => void;
  onMobileChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <input
            type="checkbox"
            checked={hasMobile}
            onChange={(e) => onToggleMobile(e.target.checked)}
          />
          Mobile
        </span>
      </div>
      <select
        className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
        value={desktopValue}
        onChange={(e) => onDesktopChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {hasMobile ? (
        <select
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={mobileValue}
          onChange={(e) => onMobileChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={`mobile-${opt}`} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : null}
    </label>
  );
}

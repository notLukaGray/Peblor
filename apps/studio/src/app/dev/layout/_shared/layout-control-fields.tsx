import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import type { WorkbenchPreviewBreakpoint } from "@/app/dev/workbench/workbench-preview-context";

const LABEL_TEXT_CLASS = "font-mono text-[10px] uppercase tracking-wide text-muted-foreground";
const INPUT_CLASS =
  "w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring";

type BaseFieldProps = {
  label: string;
  className?: string;
};

export function LayoutField({
  label,
  className,
  children,
}: BaseFieldProps & { children: ReactNode }) {
  return (
    <label className={className ?? "space-y-1.5"}>
      <span className={LABEL_TEXT_CLASS}>{label}</span>
      {children}
    </label>
  );
}

type LayoutTextFieldProps = BaseFieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">;

export function LayoutTextField({ label, className, ...inputProps }: LayoutTextFieldProps) {
  return (
    <LayoutField label={label} className={className}>
      <input type="text" className={INPUT_CLASS} {...inputProps} />
    </LayoutField>
  );
}

type LayoutNumberFieldProps = BaseFieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">;

export function LayoutNumberField({ label, className, ...inputProps }: LayoutNumberFieldProps) {
  return (
    <LayoutField label={label} className={className}>
      <input type="number" className={INPUT_CLASS} {...inputProps} />
    </LayoutField>
  );
}

type LayoutSelectFieldProps = BaseFieldProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "children"> & {
    options: readonly string[];
  };

export function LayoutSelectField({
  label,
  options,
  className,
  ...selectProps
}: LayoutSelectFieldProps) {
  return (
    <LayoutField label={label} className={className}>
      <select className={INPUT_CLASS} {...selectProps}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </LayoutField>
  );
}

type LayoutCheckboxFieldProps = {
  checked: boolean;
  onChange: () => void;
  label: string;
  className?: string;
};

export function LayoutCheckboxField({
  checked,
  onChange,
  label,
  className,
}: LayoutCheckboxFieldProps) {
  return (
    <label
      className={
        className ?? "inline-flex items-center gap-2 font-mono text-[11px] text-muted-foreground"
      }
    >
      <input
        type="checkbox"
        className="rounded border-border"
        checked={checked}
        onChange={onChange}
      />
      {label}
    </label>
  );
}

type LayoutViewportSelectProps = {
  value: WorkbenchPreviewBreakpoint;
  onChange: (next: WorkbenchPreviewBreakpoint) => void;
  className?: string;
};

export function LayoutViewportSelect({ value, onChange, className }: LayoutViewportSelectProps) {
  return (
    <label
      className={className ?? "inline-flex items-center gap-2 text-[10px] text-muted-foreground"}
    >
      <span className="font-mono uppercase tracking-wide">Viewport</span>
      <select
        className="rounded border border-border bg-background px-2 py-1 font-mono text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        value={value}
        onChange={(event) => onChange(event.target.value as WorkbenchPreviewBreakpoint)}
      >
        <option value="desktop">desktop</option>
        <option value="tablet">tablet</option>
        <option value="mobile">mobile</option>
      </select>
    </label>
  );
}

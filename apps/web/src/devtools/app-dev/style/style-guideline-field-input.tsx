import type { PbContentGuidelines } from "@/app/theme/pb-content-guidelines-config";
import {
  DEFAULT_FIELD_PLACEHOLDER,
  FIELD_PLACEHOLDER,
  FRAME_JUSTIFY_OPTIONS,
  formatDisplayValue,
} from "./style-dev-config";

type Props = {
  keyName: keyof PbContentGuidelines;
  guidelines: PbContentGuidelines;
  onFieldEdit: (key: keyof PbContentGuidelines, value: string) => void;
};

type SelectFieldKey =
  | "copyTextAlign"
  | "frameAlignItemsDefault"
  | "frameFlexDirectionDefault"
  | "frameFlexWrapDefault";

const SELECT_FIELD_OPTIONS: Record<SelectFieldKey, readonly string[]> = {
  copyTextAlign: ["start", "left", "center", "right", "justify", "end"],
  frameAlignItemsDefault: ["flex-start", "center", "flex-end", "stretch", "baseline"],
  frameFlexDirectionDefault: ["row", "row-reverse", "column", "column-reverse"],
  frameFlexWrapDefault: ["nowrap", "wrap", "wrap-reverse"],
};

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <select
      className="w-full min-w-32 rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

export function GuidelineFieldInput({ keyName, guidelines, onFieldEdit }: Props) {
  if (keyName === "frameJustifyContentDefault") {
    const value = guidelines.frameJustifyContentDefault;
    const includeCustom = !(FRAME_JUSTIFY_OPTIONS as readonly string[]).includes(value);
    return (
      <select
        className="w-full min-w-32 rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        value={value}
        onChange={(event) => onFieldEdit("frameJustifyContentDefault", event.target.value)}
      >
        {includeCustom ? <option value={value}>{value} (custom)</option> : null}
        {FRAME_JUSTIFY_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  const selectOptions = SELECT_FIELD_OPTIONS[keyName as SelectFieldKey];
  if (selectOptions) {
    return (
      <SelectInput
        value={String(guidelines[keyName] ?? "")}
        options={selectOptions}
        onChange={(value) => onFieldEdit(keyName, value)}
      />
    );
  }

  return (
    <input
      type="text"
      className="w-full min-w-24 rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-ring"
      placeholder={FIELD_PLACEHOLDER[keyName] ?? DEFAULT_FIELD_PLACEHOLDER}
      value={formatDisplayValue(keyName, guidelines)}
      onChange={(event) => onFieldEdit(keyName, event.target.value)}
    />
  );
}

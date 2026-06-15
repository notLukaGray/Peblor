"use client";

import type { ReactNode } from "react";
import type { FormFieldBlock } from "@pb/contracts/types";
import type { ElementBodyVariant } from "@pb/contracts/types";
import { useDeviceType } from "@pb/runtime-react/core/providers/device-type-provider";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import type { FormFieldValue } from "..";
import { FormFieldShell } from "./FormFieldShell";

type Props = {
  field: FormFieldBlock;
  value: FormFieldValue;
  onChange: (value: FormFieldValue) => void;
  error?: string;
  disabled?: boolean;
  style: React.CSSProperties;
  resolvedLevel?: ElementBodyVariant;
  renderNestedField?: (field: FormFieldBlock, index: number) => ReactNode;
};

export function FormFieldRow({ field, style, renderNestedField }: Props) {
  const { isMobile } = useDeviceType();
  if (field.fieldType !== "row") return null;
  if (!field.fields?.length || !renderNestedField) return null;

  const columns = field.columns ?? 2;
  const gap = resolveResponsiveValue(field.gap, isMobile) ?? "1rem";
  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "stretch",
    gap,
  };
  const childStyle: React.CSSProperties = {
    flex: `1 1 calc(${100 / columns}% - ${gap})`,
    minWidth: 0,
  };

  return (
    <FormFieldShell field={field} style={style}>
      <div style={rowStyle}>
        {field.fields.map((child, index) => (
          <div key={child.name ?? `${child.fieldType}-${index}`} style={childStyle}>
            {renderNestedField(child, index)}
          </div>
        ))}
      </div>
    </FormFieldShell>
  );
}

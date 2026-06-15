"use client";

import { useMemo, type ReactNode } from "react";
import type { FormFieldBlock } from "@pb/contracts/types";
import { useDeviceType } from "@pb/runtime-react/core/providers/device-type-provider";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import { formFieldStyleFromConfig } from "./FormFieldRenderer/form-field-style-from-config";
import { FORM_FIELD_COMPONENTS } from "./FormFieldRenderer/form-field-component-map";

export type FormFieldValue = string | string[] | boolean;

type FormFieldRendererProps = {
  field: FormFieldBlock;
  value: FormFieldValue;
  onChange: (value: FormFieldValue) => void;
  error?: string;
  disabled?: boolean;
  isSubmitting?: boolean;
  loadingText?: string;
  renderNestedField?: (field: FormFieldBlock, index: number) => ReactNode;
};

export function FormFieldRenderer({
  field,
  value,
  onChange,
  error,
  disabled,
  isSubmitting,
  loadingText,
  renderNestedField,
}: FormFieldRendererProps) {
  const { isMobile } = useDeviceType();
  const style = useMemo(() => formFieldStyleFromConfig(field, isMobile), [field, isMobile]);
  const resolvedLevel = useMemo(
    () => resolveResponsiveValue(field.level, isMobile),
    [field.level, isMobile]
  );

  const Component = FORM_FIELD_COMPONENTS[field.fieldType];
  if (!Component) return null;

  return (
    <Component
      field={field}
      value={value}
      onChange={onChange}
      error={error}
      disabled={disabled}
      isSubmitting={isSubmitting}
      loadingText={loadingText}
      style={style}
      resolvedLevel={resolvedLevel}
      renderNestedField={renderNestedField}
    />
  );
}

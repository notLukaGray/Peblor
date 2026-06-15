"use client";

import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FormFieldBlock, FormFieldOption } from "@pb/contracts/peblor/core/peblor-schemas";
import type { ElementBodyVariant } from "@pb/contracts/types";
import type { FormFieldValue } from "..";
import { globals } from "@pb/runtime-react/core/lib/globals";
import { formFieldStructuralClasses } from "./form-field-classes";
import { FormFieldDescription, getFieldDescribedBy, getFieldErrorId } from "./FormFieldFeedback";
import { FormFieldShell } from "./FormFieldShell";
import {
  getFormFieldLabelClass,
  getFormFieldLabelInlineClass,
  getFormFieldInputClass,
  getFormFieldErrorClass,
  REQUIRED_INDICATOR,
  STRUCTURAL_INPUT_BASE,
} from "./form-field-typography";

const CHOICE_FIELD_TYPES = ["checkbox", "checkboxGroup", "radio", "select", "switch"] as const;

function isChoiceFieldType(t: string): t is (typeof CHOICE_FIELD_TYPES)[number] {
  return (CHOICE_FIELD_TYPES as readonly string[]).includes(t);
}

type Props = {
  field: FormFieldBlock;
  value: FormFieldValue;
  onChange: (value: FormFieldValue) => void;
  error?: string;
  disabled?: boolean;
  style: React.CSSProperties;
  resolvedLevel?: ElementBodyVariant;
};

type SelectProps = Props & {
  field: FormFieldBlock & { fieldType: "select"; options: FormFieldOption[] };
  fieldDisabled: boolean;
  id: string | undefined;
  hasError: boolean;
  labelClass: string;
  errorClass: string;
  describedBy: string | undefined;
};

function FormFieldSelect({
  field,
  value,
  onChange,
  error,
  style,
  resolvedLevel,
  fieldDisabled,
  id,
  hasError,
  labelClass,
  errorClass,
  describedBy,
}: SelectProps) {
  const options = field.options;
  const strVal = typeof value === "string" ? value : "";
  const selectId = useId().replace(/:/g, "");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((opt) => opt.value === strVal)
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties | null>(null);
  const selectedOption = options.find((opt) => opt.value === strVal);
  const displayLabel =
    selectedOption?.label ??
    field.placeholder ??
    options[0]?.label ??
    globals.stringsLabelSelectPlaceholder;
  const submittedValue =
    selectedOption?.value ?? (field.placeholder ? "" : (options[0]?.value ?? ""));

  const updatePopupPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 4;
    const maxHeight = 240;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openAbove = spaceBelow < 160 && spaceAbove > spaceBelow;
    const height = Math.min(maxHeight, Math.max(120, openAbove ? spaceAbove : spaceBelow));
    setPopupStyle({
      position: "fixed",
      left: rect.left,
      top: openAbove ? rect.top - height - gap : rect.bottom + gap,
      width: rect.width,
      maxHeight: height,
      zIndex: "var(--pb-z-overlay)",
    });
  }, []);

  const close = useCallback(() => setOpen(false), []);
  const choose = useCallback(
    (opt: FormFieldOption) => {
      onChange(opt.value);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [onChange]
  );

  useLayoutEffect(() => {
    if (!open) return;
    updatePopupPosition();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      close();
    };
    const onScrollOrResize = () => updatePopupPosition();
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, selectedIndex, updatePopupPosition, close]);

  const popup =
    open && popupStyle && typeof document !== "undefined"
      ? createPortal(
          <ul
            ref={listRef}
            id={`${selectId}-listbox`}
            role="listbox"
            style={popupStyle}
            className="overflow-auto rounded-md border border-input bg-background py-1 text-foreground shadow-xl"
          >
            {options.map((opt, index) => {
              const selected = opt.value === submittedValue;
              const active = index === activeIndex;
              return (
                <li
                  key={opt.value}
                  id={`${selectId}-option-${index}`}
                  role="option"
                  aria-selected={selected}
                  className={`cursor-pointer px-3 py-2 ${active ? "bg-accent text-accent-foreground" : ""} ${selected && !active ? "bg-muted" : ""}`}
                  onPointerEnter={() => setActiveIndex(index)}
                  onClick={() => choose(opt)}
                >
                  {opt.label}
                </li>
              );
            })}
          </ul>,
          document.body
        )
      : null;

  return (
    <FormFieldShell field={field} style={style}>
      {field.label && (
        <label htmlFor={id} className={labelClass}>
          {field.label}
          {field.required && (
            <span className={REQUIRED_INDICATOR} aria-hidden>
              *
            </span>
          )}
        </label>
      )}
      <input type="hidden" name={field.name} value={submittedValue} />
      <button
        ref={triggerRef}
        id={id}
        disabled={fieldDisabled}
        type="button"
        role="combobox"
        aria-controls={`${selectId}-listbox`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-invalid={hasError}
        aria-describedby={describedBy}
        aria-activedescendant={open ? `${selectId}-option-${activeIndex}` : undefined}
        className={getFormFieldInputClass(
          resolvedLevel,
          field.inputClassName,
          `${STRUCTURAL_INPUT_BASE} flex items-center justify-between text-left`
        )}
        onClick={() => setOpen((next) => !next)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            close();
            return;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.min(options.length - 1, index + 1));
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.max(0, index - 1));
            return;
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (open) {
              const picked = options[activeIndex] ?? options[0];
              if (picked) choose(picked);
            } else setOpen(true);
          }
        }}
      >
        <span className={selectedOption ? undefined : "text-muted-foreground"}>{displayLabel}</span>
        <span aria-hidden>⌄</span>
      </button>
      {popup}
      <FormFieldDescription field={field} />
      {hasError && error && (
        <p id={getFieldErrorId(field, hasError)} className={errorClass} role="alert">
          {error}
        </p>
      )}
    </FormFieldShell>
  );
}

export function FormFieldChoice({
  field,
  value,
  onChange,
  error,
  disabled,
  style,
  resolvedLevel,
}: Props) {
  if (!isChoiceFieldType(field.fieldType)) return null;

  const fieldDisabled = disabled || field.disabled === true;
  const id = field.name ? `form-${field.name}` : undefined;
  const hasError = Boolean(error);
  const labelClass = getFormFieldLabelClass(resolvedLevel, field.labelClassName);
  const labelInlineClass = getFormFieldLabelInlineClass(resolvedLevel, field.labelClassName);
  const errorClass = getFormFieldErrorClass(field.errorClassName);
  const describedBy = getFieldDescribedBy(field, hasError);

  if (field.fieldType === "checkbox" || field.fieldType === "switch") {
    const checked = Boolean(value);
    return (
      <FormFieldShell field={field} style={style}>
        <label className={formFieldStructuralClasses.choiceLabel}>
          <input
            id={id}
            name={field.name}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            required={field.required}
            disabled={fieldDisabled}
            aria-invalid={hasError}
            aria-describedby={describedBy}
            className={field.inputClassName ?? formFieldStructuralClasses.checkbox}
          />
          {field.label && (
            <span className={labelInlineClass}>
              {field.label}
              {field.required && (
                <span className={REQUIRED_INDICATOR} aria-hidden>
                  *
                </span>
              )}
            </span>
          )}
        </label>
        <FormFieldDescription field={field} />
        {hasError && error && (
          <p id={getFieldErrorId(field, hasError)} className={errorClass} role="alert">
            {error}
          </p>
        )}
      </FormFieldShell>
    );
  }

  if (!field.options?.length) return null;

  const options = field.options as FormFieldOption[];

  if (field.fieldType === "select") {
    return (
      <FormFieldSelect
        field={
          { ...field, options } as FormFieldBlock & {
            fieldType: "select";
            options: FormFieldOption[];
          }
        }
        value={value}
        onChange={onChange}
        error={error}
        disabled={disabled}
        style={style}
        resolvedLevel={resolvedLevel}
        fieldDisabled={fieldDisabled}
        id={id}
        hasError={hasError}
        labelClass={labelClass}
        errorClass={errorClass}
        describedBy={describedBy}
      />
    );
  }

  if (field.fieldType === "radio") {
    const strVal = typeof value === "string" ? value : "";
    return (
      <FormFieldShell field={field} style={style}>
        {field.label && (
          <span className={labelClass}>
            {field.label}
            {field.required && (
              <span className={REQUIRED_INDICATOR} aria-hidden>
                *
              </span>
            )}
          </span>
        )}
        <div
          className={formFieldStructuralClasses.choiceGroup}
          role="radiogroup"
          aria-label={field.label}
          aria-required={field.required}
          aria-invalid={hasError}
          aria-describedby={describedBy}
        >
          {options.map((opt) => (
            <label key={opt.value} className={formFieldStructuralClasses.choiceLabel}>
              <input
                name={field.name}
                type="radio"
                value={opt.value}
                checked={strVal === opt.value}
                onChange={() => onChange(opt.value)}
                disabled={fieldDisabled}
                className={formFieldStructuralClasses.radio}
              />
              <span className={labelInlineClass}>{opt.label}</span>
            </label>
          ))}
        </div>
        <FormFieldDescription field={field} />
        {hasError && error && (
          <p id={getFieldErrorId(field, hasError)} className={errorClass} role="alert">
            {error}
          </p>
        )}
      </FormFieldShell>
    );
  }

  if (field.fieldType === "checkboxGroup") {
    const arrVal = Array.isArray(value) ? value : [];
    const toggle = (v: string) => {
      const next = arrVal.includes(v) ? arrVal.filter((x) => x !== v) : [...arrVal, v];
      onChange(next);
    };
    return (
      <FormFieldShell field={field} style={style}>
        {field.label && (
          <span className={labelClass}>
            {field.label}
            {field.required && (
              <span className={REQUIRED_INDICATOR} aria-hidden>
                *
              </span>
            )}
          </span>
        )}
        <div
          className={formFieldStructuralClasses.choiceGroup}
          role="group"
          aria-label={field.label}
          aria-describedby={describedBy}
        >
          {options.map((opt) => (
            <label key={opt.value} className={formFieldStructuralClasses.choiceLabel}>
              <input
                name={field.name}
                type="checkbox"
                value={opt.value}
                checked={arrVal.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                disabled={fieldDisabled}
                aria-invalid={hasError}
                className={formFieldStructuralClasses.checkboxGroupItem}
              />
              <span className={labelInlineClass}>{opt.label}</span>
            </label>
          ))}
        </div>
        <FormFieldDescription field={field} />
        {hasError && error && (
          <p id={getFieldErrorId(field, hasError)} className={errorClass} role="alert">
            {error}
          </p>
        )}
      </FormFieldShell>
    );
  }

  return null;
}

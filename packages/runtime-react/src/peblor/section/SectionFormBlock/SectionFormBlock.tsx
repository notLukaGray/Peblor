"use client";

import { useMemo, useRef } from "react";
import type { FormFieldBlock, SectionBlock } from "@pb/contracts/peblor/core/peblor-schemas";
import { getFormActionUrl } from "@pb/runtime-react/core/lib/forms";
import { handleSectionWheel, getDefaultScrollSpeed } from "@pb/core/layout";
import { resolveResponsiveValue } from "@pb/runtime-react/core/lib/responsive-value";
import { useSectionBaseStyles } from "@/peblor/section/position/use-section-base-styles";
import { useStickyTrait } from "@/peblor/section/position/use-sticky-trait";
import { useFixedTrait } from "@/peblor/section/position/use-fixed-trait";
import { useDeviceType } from "@pb/runtime-react/core/providers/device-type-provider";
import { applySectionFillStyle } from "@pb/core/layout";
import { LayerStack } from "@/peblor/section/stack/LayerStack";
import { SectionGlassEffect } from "@/peblor/section/stack/SectionGlassEffect";
import { useSectionViewportTrigger } from "@/peblor/triggers/core/use-section-viewport-trigger";
import { useSectionCustomTriggers } from "@/peblor/triggers/core/use-section-custom-triggers";
import {
  buildSectionContentWrapperStyle,
  sectionHeightCanStretchContent,
} from "../SectionContentBlock/section-content-block-content-wrapper-style";
import { FormFieldRenderer, type FormFieldValue } from "@/peblor/form-fields";
import {
  collectFormFields,
  isFormFieldButton,
  useFormBlockState,
  type FormFieldPath,
} from "./use-form-block-state";
import { SectionMotionWrapper } from "@/peblor/integrations/framer-motion";
import { SectionScrollTargetProvider } from "@/peblor/section/position/SectionScrollTargetContext";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";
import { resolveThemeString } from "@/peblor/theme/theme-string";

type FormBlockSection = Extract<SectionBlock, { type: "formBlock" }>;
type Props = FormBlockSection;

export function SectionFormBlock({
  id,
  ariaLabel,
  fill,
  layers,
  effects,
  width,
  height,
  align,
  marginLeft,
  marginRight,
  marginTop,
  marginBottom,
  borderRadius,
  border,
  boxShadow,
  filter,
  backdropFilter,
  clipPath,
  cursor,
  aspectRatio,
  scrollSpeed = getDefaultScrollSpeed(),
  initialX,
  initialY,
  zIndex,
  fields,
  action,
  method = "post",
  actionPayload,
  contentWidth,
  contentHeight,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  sticky,
  stickyOffset = "0px",
  stickyPosition = "top",
  fixed,
  fixedPosition = "top",
  fixedOffset = "0px",
  onVisible,
  onInvisible,
  onProgress,
  onViewportProgress,
  threshold,
  triggerOnce,
  rootMargin,
  delay,
  motion: motionFromJson,
  motionTiming,
  reduceMotion,
  keyboardTriggers,
  timerTriggers,
  cursorTriggers,
  scrollDirectionTriggers,
  idleTriggers,
}: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useDeviceType();
  const themeMode = usePeblorThemeMode();
  const resolvedAriaLabel = resolveResponsiveValue(ariaLabel, isMobile) ?? id ?? "Form";

  const {
    values,
    errors,
    submitError,
    isSubmitting,
    setSubmitError,
    setIsSubmitting,
    setValue,
    validateAll,
    getFieldKey,
  } = useFormBlockState(fields);

  const resolvedFill = resolveThemeString(resolveResponsiveValue(fill, isMobile), themeMode);
  const resolvedStickyOffset = resolveResponsiveValue(stickyOffset, isMobile) ?? "0px";
  const resolvedFixedOffset = resolveResponsiveValue(fixedOffset, isMobile) ?? "0px";

  useSectionViewportTrigger(sectionRef, {
    onVisible,
    onInvisible,
    onProgress,
    onViewportProgress,
    threshold,
    triggerOnce,
    rootMargin,
    delay,
  });

  useSectionCustomTriggers({
    keyboardTriggers,
    timerTriggers,
    cursorTriggers,
    scrollDirectionTriggers,
    idleTriggers,
  });

  const { baseStyle, resolvedLayout, alignStyle, transformY, hasInitialPosition } =
    useSectionBaseStyles({
      fill,
      width,
      height,
      minWidth,
      maxWidth,
      minHeight,
      maxHeight,
      align,
      marginLeft,
      marginRight,
      marginTop,
      marginBottom,
      borderRadius,
      border,
      boxShadow,
      filter,
      backdropFilter,
      clipPath,
      cursor,
      aspectRatio,
      scrollSpeed,
      initialX,
      initialY,
      zIndex,
      effects,
      sectionRef,
      usePadding: true,
      reduceMotion,
    });

  const { styleOverrides, placeholderStyle, showPlaceholder } = useStickyTrait({
    sectionRef,
    placeholderRef,
    sticky,
    stickyOffset: resolvedStickyOffset,
    stickyPosition,
    hasInitialPosition,
    resolvedLayout,
    alignStyle,
    transformY,
  });

  const fixedStyleOverrides = useFixedTrait({
    fixed,
    fixedPosition,
    fixedOffset: resolvedFixedOffset,
    resolvedLayout,
    zIndex,
  });

  const finalStyle = useMemo(() => {
    if (fixed) return { ...baseStyle, ...fixedStyleOverrides };
    if (sticky) return { ...baseStyle, ...styleOverrides };
    return baseStyle;
  }, [fixed, sticky, baseStyle, fixedStyleOverrides, styleOverrides]);

  const wheelHandler = useMemo(
    () => (e: React.WheelEvent<HTMLElement>) => handleSectionWheel(e, scrollSpeed),
    [scrollSpeed]
  );

  const resolvedContentWidth = resolveResponsiveValue(contentWidth, isMobile);
  const resolvedContentHeight = resolveResponsiveValue(contentHeight, isMobile);
  const contentWrapperStyle = useMemo(
    () =>
      buildSectionContentWrapperStyle({
        resolvedContentWidth,
        resolvedContentHeight,
        sectionHasExplicitHeight: sectionHeightCanStretchContent(resolvedLayout?.height),
        elementCount: fields.length,
      }),
    [resolvedContentWidth, resolvedContentHeight, resolvedLayout?.height, fields.length]
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateAll()) return;
    // Only submit to allowlisted handler URLs; never use action as a raw URL
    const submitUrl = action ? getFormActionUrl(action) : null;
    if (!submitUrl) return;

    const payload: Record<string, string | string[] | boolean> = {};
    collectFormFields(fields).forEach(({ field, path }) => {
      if (isFormFieldButton(field)) return;
      const key = getFieldKey(field, path);
      const v = values[key];
      if (v !== undefined) payload[field.name ?? key] = v;
    });
    if (actionPayload && typeof actionPayload === "object") {
      Object.entries(actionPayload).forEach(([k, v]) => {
        if (v !== undefined && v !== null) payload[k] = String(v);
      });
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(submitUrl, {
        method: method.toUpperCase(),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; redirect?: string };
      if (!res.ok) {
        setSubmitError(
          typeof data.error === "string" ? data.error : "Something went wrong. Try again."
        );
        return;
      }
      if (typeof data.redirect === "string" && data.redirect) {
        window.location.href = data.redirect;
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFormField = (field: FormFieldBlock, path: FormFieldPath) => {
    const key = getFieldKey(field, path);
    const value = values[key];
    const error = errors[key];
    return (
      <FormFieldRenderer
        key={key}
        field={field}
        value={
          value ??
          (field.fieldType === "checkbox" || field.fieldType === "switch"
            ? false
            : field.fieldType === "checkboxGroup"
              ? []
              : "")
        }
        onChange={(v: FormFieldValue) => setValue(key, v)}
        error={error}
        disabled={isSubmitting}
        isSubmitting={isSubmitting}
        renderNestedField={(child, index) => renderFormField(child, [...path, index])}
      />
    );
  };

  return (
    <>
      {!fixed && showPlaceholder && (
        <div ref={placeholderRef} style={placeholderStyle} aria-hidden />
      )}
      <SectionMotionWrapper
        sectionRef={sectionRef}
        motion={motionFromJson}
        motionTiming={motionTiming}
        reduceMotion={reduceMotion}
        className={`relative z-[var(--pb-z-raised)] flex shrink-0 flex-col min-h-0 ${fixed ? "overflow-visible" : "overflow-hidden"}`}
        style={{
          ...applySectionFillStyle(resolvedFill, layers, finalStyle),
        }}
        aria-label={resolvedAriaLabel}
        data-section-type="formBlock"
        data-fields-count={fields.length}
        onWheel={fixed ? undefined : wheelHandler}
      >
        <SectionScrollTargetProvider sectionRef={sectionRef}>
          {layers?.length ? (
            <LayerStack layers={layers} />
          ) : resolvedFill ? (
            <LayerStack fill={resolvedFill} />
          ) : null}
          <SectionGlassEffect effects={effects} sectionRef={sectionRef} isSectionFixed={!!fixed} />
          <div
            className="relative z-[var(--pb-z-raised)] flex min-h-0 flex-col items-start w-full"
            style={contentWrapperStyle}
          >
            <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
              {submitError && (
                <p className="text-sm text-destructive" role="alert">
                  {submitError}
                </p>
              )}
              {fields.map((field, i) => renderFormField(field, [i]))}
            </form>
          </div>
        </SectionScrollTargetProvider>
      </SectionMotionWrapper>
    </>
  );
}

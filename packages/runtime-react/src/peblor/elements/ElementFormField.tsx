"use client";

import { useMemo, useRef, useState, useCallback, type CSSProperties } from "react";
import type { ElementBlock, FormFieldBlock } from "@pb/contracts/types";
import { getElementLayoutStyle } from "@pb/core/layout";
import { resolveResponsiveValue } from "@pb/runtime-react/core/lib/responsive-value";
import { useDeviceType } from "@pb/runtime-react/core/providers/device-type-provider";
import { firePeblorAction } from "@/peblor/triggers";
import { SectionGlassEffect } from "@/peblor/section/stack/SectionGlassEffect";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";
import { resolveThemeStyleObject, resolveThemeValueDeep } from "@/peblor/theme/theme-string";
import { coerceSectionEffects } from "@/peblor/elements/ElementModule/element-module-style-utils";
import { FormFieldRenderer } from "../form-fields/FormFieldRenderer";
import type { FormFieldValue } from "../form-fields/FormFieldRenderer";

type Props = Extract<ElementBlock, { type: "elementFormField" }>;

export function ElementFormField({
  field,
  width,
  height,
  align,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  zIndex,
  constraints,
  effects,
  wrapperStyle,
  opacity,
  blendMode,
  boxShadow,
  filter,
  backdropFilter,
  hidden,
  interactions,
}: Props) {
  const { isMobile } = useDeviceType();
  const themeMode = usePeblorThemeMode();
  const surfaceRef = useRef<HTMLElement | null>(null);
  const [value, setValue] = useState<FormFieldValue>(field.value ?? "");

  const handleChange = useCallback((next: FormFieldValue) => {
    setValue(next);
  }, []);

  const resolvedEffects = useMemo(
    () => resolveThemeValueDeep(effects, themeMode) as typeof effects,
    [effects, themeMode]
  );
  const surfaceEffects = useMemo(() => coerceSectionEffects(resolvedEffects), [resolvedEffects]);
  const hasGlassEffect = (surfaceEffects ?? []).some((effect) => effect.type === "glass");
  const resolvedWrapperStyle = resolveThemeStyleObject(
    wrapperStyle as Record<string, unknown> | undefined,
    themeMode
  );

  const layoutStyle = getElementLayoutStyle(
    {
      width: resolveResponsiveValue(width ?? field.width ?? "min(100%, 22rem)", isMobile) as
        | string
        | undefined,
      height: height as string | undefined,
      align: align as "left" | "center" | "right" | undefined,
      marginTop: marginTop as string | undefined,
      marginBottom: marginBottom as string | undefined,
      marginLeft: marginLeft as string | undefined,
      marginRight: marginRight as string | undefined,
      zIndex,
      constraints,
      effects: resolvedEffects,
      wrapperStyle: resolvedWrapperStyle as Record<string, string | number> | undefined,
      opacity,
      blendMode,
      boxShadow,
      filter,
      backdropFilter,
      hidden,
    } as Parameters<typeof getElementLayoutStyle>[0],
    isMobile
  );

  const figureStyle: CSSProperties = {
    ...layoutStyle,
    ...(hasGlassEffect && layoutStyle.position == null ? { position: "relative" } : {}),
    ...(interactions?.cursor ? { cursor: interactions.cursor } : {}),
  };

  return (
    <figure
      ref={surfaceRef}
      className="shrink-0 m-0"
      style={figureStyle}
      onClick={
        interactions?.onClick ? () => firePeblorAction(interactions.onClick!, "trigger") : undefined
      }
      onPointerEnter={
        interactions?.onHoverEnter
          ? () => firePeblorAction(interactions.onHoverEnter!, "trigger")
          : undefined
      }
      onPointerLeave={
        interactions?.onHoverLeave
          ? () => firePeblorAction(interactions.onHoverLeave!, "trigger")
          : undefined
      }
      onPointerDown={
        interactions?.onPointerDown
          ? () => firePeblorAction(interactions.onPointerDown!, "trigger")
          : undefined
      }
      onPointerUp={
        interactions?.onPointerUp
          ? () => firePeblorAction(interactions.onPointerUp!, "trigger")
          : undefined
      }
      onDoubleClick={
        interactions?.onDoubleClick
          ? () => firePeblorAction(interactions.onDoubleClick!, "trigger")
          : undefined
      }
    >
      {hasGlassEffect && (
        <SectionGlassEffect effects={surfaceEffects} sectionRef={surfaceRef} variant="auto" />
      )}
      <FormFieldRenderer field={field as FormFieldBlock} value={value} onChange={handleChange} />
    </figure>
  );
}

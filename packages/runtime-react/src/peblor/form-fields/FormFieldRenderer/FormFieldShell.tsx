"use client";

import { useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import type { FormFieldBlock } from "@pb/contracts/peblor/core/peblor-schemas";
import { SectionGlassEffect } from "@/peblor/section/stack/SectionGlassEffect";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";
import { resolveThemeValueDeep } from "@/peblor/theme/theme-string";
import { coerceSectionEffects } from "@/peblor/elements/ElementModule/element-module-style-utils";

type Props = {
  field: FormFieldBlock;
  style: CSSProperties;
  children: ReactNode;
};

export function FormFieldShell({ field, style, children }: Props) {
  const themeMode = usePeblorThemeMode();
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const effects = useMemo(
    () => coerceSectionEffects(resolveThemeValueDeep(field.effects, themeMode)),
    [field.effects, themeMode]
  );
  const hasGlassEffect = (effects ?? []).some((effect) => effect.type === "glass");
  const wrapperStyle: CSSProperties = {
    ...style,
    ...(hasGlassEffect ? { position: "relative", overflow: "hidden" } : {}),
  };
  const contentStyle: CSSProperties | undefined = hasGlassEffect
    ? { position: "relative", zIndex: 1 }
    : undefined;
  const syncBorderRadius =
    typeof wrapperStyle.borderRadius === "string" ? wrapperStyle.borderRadius : undefined;

  return (
    <div ref={surfaceRef} style={wrapperStyle}>
      {hasGlassEffect && (
        <SectionGlassEffect
          effects={effects}
          sectionRef={surfaceRef}
          variant="auto"
          syncBorderRadius={syncBorderRadius}
        />
      )}
      <div style={contentStyle}>{children}</div>
    </div>
  );
}

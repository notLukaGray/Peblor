"use client";

import { useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import type { FormFieldBlock } from "@pb/contracts/peblor/core/peblor-schemas";
import { SectionGlassEffect } from "@/peblor/section/stack/SectionGlassEffect";
import { lowerThemeValueDeep } from "@/peblor/theme/theme-string";
import { coerceSectionEffects } from "@/peblor/elements/ElementModule/element-module-style-utils";
import { globals } from "@pb/runtime-react/core/lib/globals";

type Props = {
  field: FormFieldBlock;
  style: CSSProperties;
  children: ReactNode;
};

export function FormFieldShell({ field, style, children }: Props) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const effects = useMemo(
    () => coerceSectionEffects(lowerThemeValueDeep(field.effects)),
    [field.effects]
  );
  const hasGlassEffect = (effects ?? []).some((effect) => effect.type === "glass");
  const wrapperStyle: CSSProperties = {
    ...style,
    ...(hasGlassEffect ? { position: "relative", overflow: "hidden" } : {}),
  };
  const contentStyle: CSSProperties | undefined = hasGlassEffect
    ? { position: "relative", zIndex: globals.zIndexRaised }
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

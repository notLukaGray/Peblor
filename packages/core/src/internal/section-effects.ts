import type { CSSProperties } from "react";
import type { SectionEffect } from "@pb/contracts/types";
import { DEFAULT_BACKDROP_BLUR_AMOUNT } from "./section-constants";

export type EffectStyleResult = CSSProperties;

function handleBackdropBlur(
  effect: Extract<SectionEffect, { type: "backdropBlur" }>
): EffectStyleResult {
  const amount = effect.amount ?? DEFAULT_BACKDROP_BLUR_AMOUNT;
  return {
    backdropFilter: `blur(${amount})`,
    WebkitBackdropFilter: `blur(${amount})`,
  };
}

function handleDropShadow(
  effect: Extract<SectionEffect, { type: "dropShadow" }>
): EffectStyleResult {
  const x = effect.x ?? "0px";
  const y = effect.y ?? "4px";
  const blur = effect.blur ?? "24px";
  const spread = effect.spread ? ` ${effect.spread}` : "";
  const color = effect.color ?? "rgba(0,0,0,0.15)";
  return { boxShadow: `${x} ${y} ${blur}${spread} ${color}` };
}

function handleGlass(effect: Extract<SectionEffect, { type: "glass" }>): EffectStyleResult {
  void effect;
  return {};
}

function handleInnerShadow(
  effect: Extract<SectionEffect, { type: "innerShadow" }>
): EffectStyleResult {
  const x = effect.x ?? "0px";
  const y = effect.y ?? "4px";
  const blur = effect.blur ?? "24px";
  const spread = effect.spread ? ` ${effect.spread}` : "";
  const color = effect.color ?? "rgba(0,0,0,0.15)";
  return { boxShadow: `inset ${x} ${y} ${blur}${spread} ${color}` };
}

function handleGlow(effect: Extract<SectionEffect, { type: "glow" }>): EffectStyleResult {
  const blur = effect.blur ?? "20px";
  const spread = effect.spread ?? "0px";
  const color = effect.color ?? "rgba(0,0,0,0.5)";
  return { boxShadow: `0 0 ${blur} ${spread} ${color}` };
}

function handleOpacity(effect: Extract<SectionEffect, { type: "opacity" }>): EffectStyleResult {
  return { opacity: effect.value ?? 1 };
}

function handleBlur(effect: Extract<SectionEffect, { type: "blur" }>): EffectStyleResult {
  const amount = effect.amount ?? "4px";
  return { filter: `blur(${amount})` };
}

function handleBrightness(
  effect: Extract<SectionEffect, { type: "brightness" }>
): EffectStyleResult {
  return { filter: `brightness(${effect.value ?? 1})` };
}

function handleContrast(effect: Extract<SectionEffect, { type: "contrast" }>): EffectStyleResult {
  return { filter: `contrast(${effect.value ?? 1})` };
}

function handleSaturate(effect: Extract<SectionEffect, { type: "saturate" }>): EffectStyleResult {
  return { filter: `saturate(${effect.value ?? 1})` };
}

function handleGrayscale(effect: Extract<SectionEffect, { type: "grayscale" }>): EffectStyleResult {
  return { filter: `grayscale(${effect.value ?? 0})` };
}

function handleSepia(effect: Extract<SectionEffect, { type: "sepia" }>): EffectStyleResult {
  return { filter: `sepia(${effect.value ?? 0})` };
}

const EFFECT_HANDLERS: Record<SectionEffect["type"], (effect: SectionEffect) => EffectStyleResult> =
  {
    backdropBlur: handleBackdropBlur as (e: SectionEffect) => EffectStyleResult,
    glass: handleGlass as (e: SectionEffect) => EffectStyleResult,
    dropShadow: handleDropShadow as (e: SectionEffect) => EffectStyleResult,
    innerShadow: handleInnerShadow as (e: SectionEffect) => EffectStyleResult,
    glow: handleGlow as (e: SectionEffect) => EffectStyleResult,
    opacity: handleOpacity as (e: SectionEffect) => EffectStyleResult,
    blur: handleBlur as (e: SectionEffect) => EffectStyleResult,
    brightness: handleBrightness as (e: SectionEffect) => EffectStyleResult,
    contrast: handleContrast as (e: SectionEffect) => EffectStyleResult,
    saturate: handleSaturate as (e: SectionEffect) => EffectStyleResult,
    grayscale: handleGrayscale as (e: SectionEffect) => EffectStyleResult,
    sepia: handleSepia as (e: SectionEffect) => EffectStyleResult,
  };

/** Maps section effects to CSS. Schemas: data/schemas/effects.json. */
export function sectionEffectsToStyle(effects: SectionEffect[] | undefined): CSSProperties {
  if (!effects?.length) return {};
  const shadows: string[] = [];
  const filters: string[] = [];
  const backdropFilters: string[] = [];
  let style: CSSProperties = {};

  for (const effect of effects) {
    const handler = EFFECT_HANDLERS[effect.type];
    const result = handler ? handler(effect) : {};
    const boxShadow = result.boxShadow;
    const filter = result.filter;
    const backdropFilter = result.backdropFilter;
    const rest: CSSProperties = { ...result };
    delete rest.boxShadow;
    delete rest.filter;
    delete rest.backdropFilter;
    delete (rest as Record<string, unknown>).WebkitBackdropFilter;
    if (typeof boxShadow === "string" && boxShadow.length > 0) shadows.push(boxShadow);
    if (typeof filter === "string" && filter.length > 0) filters.push(filter);
    if (typeof backdropFilter === "string" && backdropFilter.length > 0) {
      backdropFilters.push(backdropFilter);
    }
    if (Object.keys(rest).length > 0) style = { ...style, ...rest };
  }

  return {
    ...style,
    ...(shadows.length > 0 && { boxShadow: shadows.join(", ") }),
    ...(filters.length > 0 && { filter: filters.join(" ") }),
    ...(backdropFilters.length > 0 && {
      backdropFilter: backdropFilters.join(" "),
      WebkitBackdropFilter: backdropFilters.join(" "),
    }),
  };
}

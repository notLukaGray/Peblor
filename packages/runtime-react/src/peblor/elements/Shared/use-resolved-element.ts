"use client";

import { useMemo } from "react";
import type {
  ElementBlock,
  MotionPropsFromJson,
  MotionTiming,
  ThemeString,
} from "@pb/contracts/peblor/core/peblor-schemas";
import { resolveElementBlockForBreakpoint } from "@pb/core/layout";
import { useDeviceType } from "@pb/runtime-react/core/providers/device-type-provider";
import { lowerThemeStyleObject, lowerThemeValueDeep } from "@/peblor/theme/theme-string";

type BorderGradient = { stroke: ThemeString; width: string | number };
type ResolvedBorderGradient = { stroke: string; width: string | number };

const MOTION_TARGET_KEYS = [
  "initial",
  "animate",
  "whileHover",
  "whileTap",
  "whileFocus",
  "whileInView",
  "exit",
] as const;

function toSolidBackgroundLayer(color: string): string {
  return `linear-gradient(${color}, ${color})`;
}

function replaceLayeredBackgroundFill(background: string, color: string): string | null {
  const marker = " padding-box, ";
  const splitIndex = background.lastIndexOf(marker);
  if (splitIndex === -1) return null;
  const borderLayer = background.slice(splitIndex + marker.length);
  return `${toSolidBackgroundLayer(color)} padding-box, ${borderLayer}`;
}

function rewriteMotionBackgroundTargets(
  motionConfig: MotionPropsFromJson | undefined,
  wrapperStyle: React.CSSProperties | undefined
): MotionPropsFromJson | undefined {
  if (!motionConfig || typeof motionConfig !== "object") return motionConfig;
  const baseBackground = wrapperStyle?.background;
  if (typeof baseBackground !== "string" || !baseBackground.includes(" padding-box, ")) {
    return motionConfig;
  }

  let didRewrite = false;
  const rewritten: Record<string, unknown> = { ...(motionConfig as Record<string, unknown>) };

  for (const key of MOTION_TARGET_KEYS) {
    const target = rewritten[key];
    if (!target || typeof target !== "object") continue;
    const targetRecord = target as Record<string, unknown>;
    const backgroundColor = targetRecord.backgroundColor;
    if (typeof backgroundColor !== "string" || "background" in targetRecord) continue;
    const layeredBackground = replaceLayeredBackgroundFill(baseBackground, backgroundColor);
    if (!layeredBackground) continue;
    const { backgroundColor: _backgroundColor, ...rest } = targetRecord;
    rewritten[key] = { ...rest, background: layeredBackground };
    didRewrite = true;
  }

  return didRewrite ? (rewritten as MotionPropsFromJson) : motionConfig;
}

/** Resolved + processed values that correspond to fields destructured from the resolved block. */
export type UseResolvedElementResult = {
  /** The block after breakpoint resolution. */
  resolvedBlock: ElementBlock;
  /** True when the block has entrance timing with a resolved entrance motion. */
  hasEntranceTiming: boolean;
  /** Theme-resolved wrapperStyle — full object after lowering theme strings to CSS. */
  resolvedWrapperStyle: React.CSSProperties | undefined;
  /** Motion-safe wrapperStyle properties (identical to raw JSON). */
  motionSafeWrapperStyle: React.CSSProperties | undefined;
  /** Theme-only wrapperStyle properties (resolved differently from raw JSON). */
  themeOnlyWrapperStyle: React.CSSProperties | undefined;
  /** Border gradient with theme strings lowered to CSS values. */
  resolvedBorderGradient: ResolvedBorderGradient | undefined;
  /** Motion config with theme strings lowered to CSS values. */
  resolvedMotionFromJson: MotionPropsFromJson | undefined;
  /** Motion config after background-target rewriting for border-gradient support. */
  rewrittenMotionFromJson: MotionPropsFromJson | undefined;
  /** Extracted wrapperStyle from resolvedBlock (raw, before theme lowering). */
  wrapperStyle: React.CSSProperties | undefined;
  /** Extracted motion from resolvedBlock (raw, before theme lowering). */
  motionFromJson: MotionPropsFromJson | undefined;
  /** Extracted borderGradient from resolvedBlock (raw, before theme lowering). */
  extractedBorderGradient: BorderGradient | undefined;
  /** Extracted motionTiming from resolvedBlock. */
  motionTiming: MotionTiming | undefined;
  /** Extracted fixed from resolvedBlock. */
  fixed: boolean | undefined;
  /** Extracted align from resolvedBlock. */
  align: "left" | "center" | "right" | undefined;
  /** Extracted alignY from resolvedBlock. */
  alignY: "top" | "center" | "bottom" | undefined;
  /** Extracted aria from resolvedBlock. */
  aria: Record<string, string | boolean> | undefined;
  /** Extracted exitPreset from resolvedBlock. */
  exitPreset: string | undefined;
  /** Extracted reduceMotion from resolvedBlock. */
  reduceMotion: boolean | undefined;
  /** Remaining block props after extracting known fields. */
  blockProps: Record<string, unknown>;
  /** Entrance wrapper layout style, or undefined if not needed. */
  entranceWrapperStyle: React.CSSProperties | undefined;
};

/**
 * Resolves an element block for the current breakpoint, destructures known fields,
 * then applies theme lowering and motion-rewriting pipeline.
 *
 * This single hook replaces ~90 lines of sequential useMemo + destructure in ElementRenderer.
 */
export function useResolvedElement(block: ElementBlock): UseResolvedElementResult {
  const { isMobile } = useDeviceType();
  const resolvedBlock = useMemo(
    () => resolveElementBlockForBreakpoint(block, isMobile),
    [block, isMobile]
  );

  // Destructure from resolvedBlock — keep height in blockProps for later dimension-gesture handling
  const {
    motionTiming,
    fixed,
    align,
    alignY,
    aria,
    motion: motionFromJson,
    exitPreset,
    wrapperStyle,
    reduceMotion,
    borderGradient: extractedBorderGradient,
    ...blockProps
  } = resolvedBlock as ElementBlock & {
    motionTiming?: MotionTiming;
    fixed?: boolean;
    align?: "left" | "center" | "right";
    alignY?: "top" | "center" | "bottom";
    aria?: Record<string, string | boolean>;
    motion?: MotionPropsFromJson;
    exitPreset?: string;
    wrapperStyle?: React.CSSProperties;
    reduceMotion?: boolean;
    borderGradient?: BorderGradient;
  };

  const hasEntranceTiming = !!motionTiming?.resolvedEntranceMotion;

  const entranceWrapperStyle = useMemo(() => {
    if (!hasEntranceTiming) return undefined;
    const ext = resolvedBlock as ElementBlock & {
      fixed?: boolean;
      align?: "left" | "center" | "right";
      height?: string | number;
    };
    return ext.fixed ? undefined : buildEntranceWrapperStyle(ext.align, ext.height === "100%");
  }, [hasEntranceTiming, resolvedBlock]);

  // ---- Theme & motion processing ----

  const resolvedWrapperStyle = useMemo(
    () => lowerThemeStyleObject(wrapperStyle) as React.CSSProperties | undefined,
    [wrapperStyle]
  );

  const [motionSafeWrapperStyle, themeOnlyWrapperStyle] = useMemo<
    [React.CSSProperties | undefined, React.CSSProperties | undefined]
  >(() => {
    if (!resolvedWrapperStyle || !wrapperStyle) return [resolvedWrapperStyle, undefined];
    const raw = wrapperStyle as Record<string, unknown>;
    const resolved = resolvedWrapperStyle as Record<string, unknown>;
    let hasTheme = false;
    const motionSafe: Record<string, unknown> = {};
    const themeOnly: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(resolved)) {
      if (resolved[k] !== raw[k]) {
        themeOnly[k] = v;
        hasTheme = true;
      } else {
        motionSafe[k] = v;
      }
    }
    if (!hasTheme) return [resolvedWrapperStyle, undefined];
    return [
      Object.keys(motionSafe).length > 0 ? (motionSafe as React.CSSProperties) : undefined,
      themeOnly as React.CSSProperties,
    ];
  }, [resolvedWrapperStyle, wrapperStyle]);

  const resolvedBorderGradient = useMemo(
    () => lowerThemeValueDeep(extractedBorderGradient) as ResolvedBorderGradient | undefined,
    [extractedBorderGradient]
  );

  const resolvedMotionFromJson = useMemo(
    () => lowerThemeValueDeep(motionFromJson) as MotionPropsFromJson | undefined,
    [motionFromJson]
  );

  const rewrittenMotionFromJson = useMemo(
    () => rewriteMotionBackgroundTargets(resolvedMotionFromJson, motionSafeWrapperStyle),
    [resolvedMotionFromJson, motionSafeWrapperStyle]
  );

  return {
    resolvedBlock,
    hasEntranceTiming,
    resolvedWrapperStyle,
    motionSafeWrapperStyle,
    themeOnlyWrapperStyle,
    resolvedBorderGradient,
    resolvedMotionFromJson,
    rewrittenMotionFromJson,
    wrapperStyle,
    motionFromJson,
    extractedBorderGradient,
    motionTiming,
    fixed,
    align,
    alignY,
    aria,
    exitPreset,
    reduceMotion,
    blockProps: blockProps as Record<string, unknown>,
    entranceWrapperStyle,
  };
}

function buildEntranceWrapperStyle(
  align: "left" | "center" | "right" | undefined,
  fillHeight?: boolean
): React.CSSProperties {
  const justifyContent =
    align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";
  return {
    width: "100%",
    display: "flex",
    justifyContent,
    ...(fillHeight ? { height: "100%", alignItems: "stretch" } : {}),
  };
}

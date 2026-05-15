"use client";

import type { ElementBlock } from "@pb/contracts/types";
import type { ThemeString } from "@pb/contracts/types";
import { useSectionScrollTarget } from "@/peblor/section/position/SectionScrollTargetContext";
import { SectionScrollProgressBar } from "@/peblor/integrations/framer-motion";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";
import { type PeblorThemeMode, resolveThemeString } from "@/peblor/theme/theme-string";

type Props = Extract<ElementBlock, { type: "elementScrollProgressBar" }>;

/** Coerce responsive or tuple value to a single string for bar style props. */
function asString(v: unknown, themeMode: PeblorThemeMode): string | undefined {
  if (typeof v === "string" || (v != null && typeof v === "object" && !Array.isArray(v))) {
    return resolveThemeString(v as ThemeString, themeMode);
  }
  if (Array.isArray(v)) return asString(v[0], themeMode);
  return undefined;
}

/**
 * Renders a scroll progress bar (0→1) for the parent section. Must be placed inside
 * a section that provides SectionScrollTargetContext; otherwise renders nothing.
 * Style from element props or motion-defaults progressBar.
 */
export function ElementScrollProgressBar(props: Props) {
  const themeMode = usePeblorThemeMode();
  const sectionRef = useSectionScrollTarget();
  if (!sectionRef) return null;

  const height = asString(props.height, themeMode);
  const fill = asString(props.fill, themeMode);
  const trackBackground = asString(props.trackBackground, themeMode);
  const offset =
    Array.isArray(props.offset) && props.offset.length === 2
      ? (props.offset as [string, string])
      : undefined;

  return (
    <div
      className="w-full"
      style={{
        position: "relative",
        height: 0,
        overflow: "visible",
      }}
    >
      <SectionScrollProgressBar
        sectionRef={sectionRef}
        height={height}
        fill={fill}
        trackBackground={trackBackground}
        offset={offset}
      />
    </div>
  );
}

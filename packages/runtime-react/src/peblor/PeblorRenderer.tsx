"use client";

import { useMemo } from "react";
import type { bgBlock, SectionBlock } from "@pb/contracts/types";
import { SECTION_COMPONENTS } from "@/peblor/section";
import { generateSectionKey } from "@pb/core/keys";
import type { TriggerAction } from "@pb/contracts/types";
import type { BackgroundTransitionEffect } from "@pb/contracts/types";
import { usePeblorTriggers } from "@/peblor/hooks/use-peblor-triggers";
import { ServerBreakpointProvider } from "@pb/runtime-react/core/providers/device-type-provider";
import { PeblorBackground } from "./PeblorBackground";
import { SectionErrorBoundary } from "./SectionErrorBoundary";

/** Stable spread targets: avoid allocating a fresh `{ _isFirstSection: … }` per section per render. */
const SECTION_EXTRA_PROPS_NONE = {};
const SECTION_EXTRA_PROPS_FIRST = { _isFirstSection: true as const };

type Props = {
  resolvedBg: bgBlock | null;
  resolvedSections: SectionBlock[];
  onPageProgress?: TriggerAction;
  bgDefinitions?: Record<string, bgBlock>;
  transitions?: BackgroundTransitionEffect | BackgroundTransitionEffect[];
  serverIsMobile?: boolean;
};

export function PeblorRenderer({
  resolvedBg,
  resolvedSections,
  onPageProgress,
  bgDefinitions,
  transitions,
  serverIsMobile,
}: Props) {
  const {
    currentBg,
    sectionsWithOverrides,
    activeTransitionIds,
    reversingTransitionIds,
    transitionProgress,
    setActiveTransitionIds,
    setReversingTransitionIds,
    transitionsArray,
  } = usePeblorTriggers({
    resolvedBg,
    resolvedSections,
    onPageProgress,
    bgDefinitions,
    transitions,
  });

  const bg = currentBg;
  const sections = sectionsWithOverrides;

  const resolvedTransitionBackgrounds = useMemo(() => {
    if (transitionsArray.length === 0 || !bgDefinitions)
      return new Map<string, { fromBg: bgBlock | null; toBg: bgBlock | null }>();
    const resolved = new Map<string, { fromBg: bgBlock | null; toBg: bgBlock | null }>();
    for (const transition of transitionsArray) {
      const transitionId = transition.id;
      const fromBgRaw = bgDefinitions[transition.from];
      const toBgRaw = bgDefinitions[transition.to];
      if (!fromBgRaw || !toBgRaw) {
        resolved.set(transitionId, { fromBg: null, toBg: null });
        continue;
      }
      resolved.set(transitionId, { fromBg: fromBgRaw, toBg: toBgRaw });
    }
    return resolved;
  }, [transitionsArray, bgDefinitions]);

  const hasAbsoluteSections = sections.some(
    (s) =>
      s &&
      typeof s === "object" &&
      ((s as Record<string, unknown>).initialX != null ||
        (s as Record<string, unknown>).initialY != null)
  );

  const firstContentSectionIndex = useMemo(
    () => sections.findIndex((s) => s.type !== "divider"),
    [sections]
  );

  const content = (
    <>
      <PeblorBackground
        bg={bg}
        transitionsArray={transitionsArray}
        activeTransitionIds={activeTransitionIds}
        reversingTransitionIds={reversingTransitionIds}
        transitionProgress={transitionProgress}
        resolvedTransitionBackgrounds={resolvedTransitionBackgrounds}
        setActiveTransitionIds={setActiveTransitionIds}
        setReversingTransitionIds={setReversingTransitionIds}
      />
      <div>
        {sections.map((section, i) => {
          const SectionComponent = SECTION_COMPONENTS[section.type];
          const key = generateSectionKey(section, i);
          const sectionExtraProps =
            firstContentSectionIndex >= 0 && i === firstContentSectionIndex
              ? SECTION_EXTRA_PROPS_FIRST
              : SECTION_EXTRA_PROPS_NONE;
          if (!SectionComponent) {
            throw new Error(`unknown section type: "${section.type}"`);
          }
          return (
            <SectionErrorBoundary key={key} sectionKey={key}>
              <SectionComponent {...section} {...sectionExtraProps} />
            </SectionErrorBoundary>
          );
        })}
      </div>
    </>
  );

  const wrapper = (
    <div
      className={hasAbsoluteSections ? "relative w-full" : ""}
      style={hasAbsoluteSections ? { minHeight: "100%" } : undefined}
    >
      {serverIsMobile !== undefined ? (
        <ServerBreakpointProvider isMobile={serverIsMobile}>{content}</ServerBreakpointProvider>
      ) : (
        content
      )}
    </div>
  );

  return wrapper;
}

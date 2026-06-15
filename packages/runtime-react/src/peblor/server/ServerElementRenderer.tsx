import type { CSSProperties } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import type { MotionPropsFromJson, MotionTiming } from "@pb/contracts/types";
import type { BlockCapabilityNode } from "../analyze/block-capabilities";
import {
  resolveElementBlockForBreakpoint,
  extractElementResponsiveLayoutStyles,
  getResponsiveLayoutKeySet,
} from "@pb/core/layout";
import { computeStateStyle } from "../elements/Shared/state-style";
import {
  buildResponsiveStyle,
  type ResponsiveStyleInput,
} from "../elements/Shared/responsive-style";
// Server/client classification is sourced from block-capabilities.ts — single source of truth.
// ServerElementRenderer consumes analyzeBlockCapabilities() to decide render strategy per block.
import { analyzeBlockCapabilities } from "../analyze/block-capabilities";
import { ClientElementIsland } from "../client-islands/ClientElementIsland";
import { ServerElementGroup } from "./elements/ServerElementGroup";
import { MixedServerElementGroup } from "./elements/MixedServerElementGroup";
import { SERVER_ELEMENT_COMPONENTS } from "./server-element-registry";
import { ServerEntranceShell } from "../client-islands/ServerEntranceShell";

export type ServerElementRendererProps = {
  block: ElementBlock;
  serverIsMobile?: boolean;
  analysisNode?: BlockCapabilityNode;
};

type ElementGroupExtended = Extract<ElementBlock, { type: "elementGroup" }> & {
  motionTiming?: MotionTiming;
  layoutChildren?: boolean;
  visibleWhen?: unknown;
  disclosure?: unknown;
};

/**
 * Build the entrance wrapper's container style from the element's align prop.
 * Mirrors buildEntranceWrapperStyle in ElementRenderer so SSR and client layout match.
 */
function buildServerEntranceWrapperStyle(
  align: "left" | "center" | "right" | undefined
): CSSProperties {
  const justifyContent =
    align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
  return { width: "100%", display: "flex", justifyContent };
}

/**
 * Whether the block has animation props that need a thin client wrapper but
 * NOT a full ClientElementIsland. Excludes the onTrigger exception (those
 * stay in ClientElementIsland via classification).
 */
function hasAnimationWrapper(block: ElementBlock): boolean {
  const rec = block as Record<string, unknown>;
  const mt = rec.motionTiming as MotionTiming | undefined;
  const motion = rec.motion as MotionPropsFromJson | undefined;
  const hasEntrance = mt?.resolvedEntranceMotion != null;
  const hasGesture = motion != null && Object.keys(motion).length > 0;
  return hasEntrance || hasGesture;
}

export function ServerElementRenderer({
  block,
  serverIsMobile,
  analysisNode,
}: ServerElementRendererProps) {
  const resolvedBlock =
    serverIsMobile === undefined ? block : resolveElementBlockForBreakpoint(block, serverIsMobile);
  const elementAnalysis =
    analysisNode ??
    analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [{ type: "contentBlock", elements: [resolvedBlock] } as never],
    }).tree.children[0]?.children[0];

  if (elementAnalysis?.classification !== "static") {
    if (block.type === "elementGroup") {
      // Use raw `block` (not resolvedBlock) so the client island receives the original
      // responsive objects (e.g. flexDirection: {base, md}) and can resolve them via
      // useDeviceType() on resize. Pre-collapsing to serverIsMobile scalars would prevent
      // the client island from ever switching layout at breakpoints.
      const group = block as ElementGroupExtended & { reorderable?: boolean };
      const hasLayoutOverride = !!(
        group.layoutChildren ||
        group.visibleWhen ||
        group.disclosure ||
        group.reorderable
      );
      const mt = group.motionTiming;
      const isOnTrigger = (mt as Record<string, unknown> | undefined)?.trigger === "onTrigger";

      if (!hasLayoutOverride && !isOnTrigger) {
        return (
          <MixedServerElementGroup
            {...(group as Extract<ElementBlock, { type: "elementGroup" }>)}
            serverIsMobile={serverIsMobile}
          />
        );
      }
    }
    return <ClientElementIsland block={block} />;
  }

  // ── Static path ──────────────────────────────────────────────────────────

  if (resolvedBlock.type === "elementGroup") {
    const group = resolvedBlock as ElementGroupExtended & { reorderable?: boolean };
    if (group.reorderable) {
      return <ClientElementIsland block={resolvedBlock} />;
    }

    // Non-stagger motionTiming groups are now "static" (classification demoted).
    // ServerElementGroup SSRs children synchronously; ServerEntranceShell
    // adds the entrance animation as a thin client boundary around the group.
    if (hasAnimationWrapper(resolvedBlock)) {
      const rec = resolvedBlock as Record<string, unknown>;
      const mt = rec.motionTiming as MotionTiming | undefined;
      const motion = rec.motion as MotionPropsFromJson | undefined;
      const align = rec.align as "left" | "center" | "right" | undefined;
      return (
        <ServerEntranceShell
          motionTiming={mt}
          elementMotion={motion}
          wrapperStyle={buildServerEntranceWrapperStyle(align)}
        >
          <ServerElementGroup
            {...(resolvedBlock as Extract<ElementBlock, { type: "elementGroup" }>)}
            serverIsMobile={serverIsMobile}
          />
        </ServerEntranceShell>
      );
    }

    return (
      <ServerElementGroup
        {...(resolvedBlock as Extract<ElementBlock, { type: "elementGroup" }>)}
        serverIsMobile={serverIsMobile}
      />
    );
  }

  const Component = SERVER_ELEMENT_COMPONENTS[resolvedBlock.type];
  if (!Component) {
    throw new Error(`unknown server element type: "${resolvedBlock.type}"`);
  }

  // Compute scoped state-style class for hover/focus/active/disabled from element base schema.
  const rec2 = resolvedBlock as Record<string, unknown>;
  const stateStyleResult = computeStateStyle({
    id: typeof rec2.id === "string" ? rec2.id : undefined,
    hoverStyle: rec2.hoverStyle as Record<string, string | number> | undefined,
    focusStyle: rec2.focusStyle as Record<string, string | number> | undefined,
    focusVisibleStyle: rec2.focusVisibleStyle as Record<string, string | number> | undefined,
    activeStyle: rec2.activeStyle as Record<string, string | number> | undefined,
    disabledStyle: rec2.disabledStyle as Record<string, string | number> | undefined,
  });
  const { className: stateStyleClass, css: stateStyleCss } = stateStyleResult;

  // ── Responsive style emission (stage 3 — ALL element types get layout CSS) ─────
  // Extract responsive typography props (heading/body only) AND layout props (all types)
  // from the raw (pre-resolution) block, then merge them into a single buildResponsiveStyle
  // call so one <style> tag and one class name covers everything.
  let responsiveStyleClass: string | undefined;
  let responsiveStyleCss: string | undefined;
  let responsiveNeedsContainer = false;
  const rawBlock = block as Record<string, unknown>;
  const responsiveLayoutKeys: string[] | undefined = getResponsiveLayoutKeySet(rawBlock);
  const styles: Record<string, unknown> = {};

  // Layout-responsive props (every element type)
  Object.assign(styles, extractElementResponsiveLayoutStyles(rawBlock));

  // Typography-responsive props (heading/body only)
  if (resolvedBlock.type === "elementHeading" || resolvedBlock.type === "elementBody") {
    const typographyKeys = ["fontSize", "lineHeight", "letterSpacing"] as const;
    for (const key of typographyKeys) {
      const v = rawBlock[key];
      // Only include non-scalar values (objects/arrays) — scalars are already
      // handled by the inline style and don't need a responsive CSS rule.
      if (v !== undefined && v !== null && typeof v === "object") {
        styles[key] = v;
      }
    }
  }

  if (Object.keys(styles).length > 0) {
    const responsiveResult = buildResponsiveStyle({
      id: typeof rawBlock.id === "string" ? rawBlock.id : undefined,
      styles,
    } as ResponsiveStyleInput);
    responsiveStyleClass = responsiveResult.className;
    responsiveStyleCss = responsiveResult.css;
    responsiveNeedsContainer = responsiveResult.needsContainer;
  }

  const serverEl = (
    <Component
      {...resolvedBlock}
      serverIsMobile={serverIsMobile}
      stateStyleClass={stateStyleClass}
      responsiveStyleClass={responsiveStyleClass}
      responsiveNeedsContainer={responsiveNeedsContainer}
      responsiveLayoutKeys={responsiveLayoutKeys}
    />
  );

  // Wrap with <style> sibling when state styles are present. React 19 / Next.js 15 hoists
  // inline <style> tags from RSC output to <head> during SSR, so this is safe and correct.
  const withStateStyle = stateStyleCss ? (
    <>
      <style dangerouslySetInnerHTML={{ __html: stateStyleCss }} data-pb-st={stateStyleClass} />
      {serverEl}
    </>
  ) : (
    serverEl
  );

  // Wrap with responsive <style> sibling when responsive typography styles are present.
  // Identical pattern to state-style emission — data-pb-rs carries the class for client parity.
  const withResponsiveStyle = responsiveStyleCss ? (
    <>
      <style
        dangerouslySetInnerHTML={{ __html: responsiveStyleCss }}
        data-pb-rs={responsiveStyleClass}
      />
      {withStateStyle}
    </>
  ) : (
    withStateStyle
  );

  // Apply thin animation wrapper for static elements with entrance/gesture motion.
  // The server component renders the content; ServerEntranceShell adds only
  // the motion boundary — no structural DOM change, no CLS from the element itself.
  if (hasAnimationWrapper(resolvedBlock)) {
    const mt = rec2.motionTiming as MotionTiming | undefined;
    const motion = rec2.motion as MotionPropsFromJson | undefined;
    const align = rec2.align as "left" | "center" | "right" | undefined;
    return (
      <ServerEntranceShell
        motionTiming={mt}
        elementMotion={motion}
        wrapperStyle={buildServerEntranceWrapperStyle(align)}
      >
        {withResponsiveStyle}
      </ServerEntranceShell>
    );
  }

  return withResponsiveStyle;
}

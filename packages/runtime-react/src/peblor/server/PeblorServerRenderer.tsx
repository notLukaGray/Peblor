import type { CSSProperties } from "react";
import type { BackgroundTransitionEffect, SectionBlock, bgBlock } from "@pb/contracts/types";
import type { BlockCapabilityNode } from "../analyze/block-capabilities";
import { resolveThemeString } from "../theme/theme-string";
import { bgVariableNeedsClient } from "../background/background-variable-client-capability";
import { ClientBackgroundIsland } from "../client-islands/ClientBackgroundIsland";
import { ClientBackgroundTransitionIsland } from "../client-islands/ClientBackgroundTransitionIsland";
import { ServerSectionRenderer } from "./ServerSectionRenderer";

export type PeblorServerRendererProps = {
  resolvedBg: bgBlock | null;
  resolvedSections: SectionBlock[];
  bgDefinitions?: Record<string, bgBlock>;
  transitions?: BackgroundTransitionEffect | BackgroundTransitionEffect[];
  serverIsMobile?: boolean;
  sectionAnalysis?: BlockCapabilityNode[];
};

function backgroundImageUrl(src: string): string {
  return `url(${JSON.stringify(src)})`;
}

function hasTransitions(
  transitions: BackgroundTransitionEffect | BackgroundTransitionEffect[] | undefined
): transitions is BackgroundTransitionEffect | BackgroundTransitionEffect[] {
  return Array.isArray(transitions) ? transitions.length > 0 : transitions != null;
}

function renderServerBackground(
  bg: bgBlock | null,
  bgDefinitions: Record<string, bgBlock> | undefined,
  transitions: BackgroundTransitionEffect | BackgroundTransitionEffect[] | undefined
) {
  if (!bg) return null;
  if (hasTransitions(transitions)) {
    return (
      <ClientBackgroundTransitionIsland
        resolvedBg={bg}
        bgDefinitions={bgDefinitions}
        transitions={transitions}
      />
    );
  }

  const baseStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
  };

  if (bg.type === "backgroundVideo") {
    return <ClientBackgroundIsland bg={bg} priority />;
  }

  if (bg.type === "backgroundImage") {
    return (
      <div
        aria-hidden
        style={{
          ...baseStyle,
          backgroundImage: backgroundImageUrl(bg.image),
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
    );
  }

  if (bg.type === "backgroundPattern") {
    return (
      <div
        aria-hidden
        style={{
          ...baseStyle,
          backgroundImage: backgroundImageUrl(bg.image),
          backgroundRepeat: bg.repeat ?? "repeat",
        }}
      />
    );
  }

  if (bg.type === "backgroundVariable") {
    if (bgVariableNeedsClient(bg)) {
      return <ClientBackgroundIsland bg={bg} priority />;
    }
    return (
      <div aria-hidden style={baseStyle}>
        {bg.layers.map((layer, index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              inset: 0,
              background: resolveThemeString(layer.fill, "light"),
              backgroundSize: layer.backgroundSize,
              backgroundPosition: layer.backgroundPosition,
              mixBlendMode: layer.blendMode as CSSProperties["mixBlendMode"],
              opacity: layer.opacity,
            }}
          />
        ))}
      </div>
    );
  }

  return null;
}

export function PeblorServerRenderer({
  resolvedBg,
  resolvedSections,
  bgDefinitions,
  transitions,
  serverIsMobile,
  sectionAnalysis,
}: PeblorServerRendererProps) {
  const hasAbsoluteSections = resolvedSections.some(
    (section) =>
      section && typeof section === "object" && ("initialX" in section || "initialY" in section)
  );

  return (
    <div
      className={hasAbsoluteSections ? "relative w-full" : ""}
      style={hasAbsoluteSections ? { minHeight: "100%" } : undefined}
      data-pb-server-renderer="static"
    >
      {renderServerBackground(resolvedBg, bgDefinitions, transitions)}
      <div style={{ position: "relative", zIndex: 2 }}>
        {resolvedSections.map((section, index) => (
          <ServerSectionRenderer
            key={(section as SectionBlock & { id?: string }).id ?? `${section.type}-${index}`}
            section={section}
            serverIsMobile={serverIsMobile}
            analysisNode={sectionAnalysis?.[index]}
          />
        ))}
      </div>
    </div>
  );
}

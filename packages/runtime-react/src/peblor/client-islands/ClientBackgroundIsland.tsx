"use client";

import type { BackgroundTransitionEffect, bgBlock } from "@pb/contracts/types";
import type { BackgroundVideoProps } from "../background/BackgroundVideo/background-video-types";
import { bgVariableNeedsClient } from "../background/background-variable-client-capability";
import dynamic from "next/dynamic";

const BackgroundVideo = dynamic(() =>
  import("../background/BackgroundVideo").then((mod) => ({ default: mod.BackgroundVideo }))
);

const BackgroundVariable = dynamic(() =>
  import("../background/BackgroundVariable").then((mod) => ({ default: mod.BackgroundVariable }))
);

const BackgroundTransition = dynamic(() =>
  import("../background/BackgroundTransition").then((mod) => ({
    default: mod.BackgroundTransition,
  }))
);

const ClientBackgroundTransitionIsland = dynamic(() =>
  import("./ClientBackgroundTransitionIsland").then((mod) => ({
    default: mod.ClientBackgroundTransitionIsland,
  }))
);

type BgVariable = Extract<bgBlock, { type: "backgroundVariable" }>;

type Props = {
  bg: bgBlock;
  priority?: boolean;
  /** Used in background-island render mode for transition backgrounds. */
  bgDefinitions?: Record<string, bgBlock>;
  /** Used in background-island render mode for transition backgrounds. */
  transitions?: BackgroundTransitionEffect | BackgroundTransitionEffect[];
};

export function ClientBackgroundIsland({ bg, priority, bgDefinitions, transitions }: Props) {
  // Background-island mode with transitions — delegate to transition island
  if (transitions != null && (Array.isArray(transitions) ? transitions.length > 0 : true)) {
    return (
      <ClientBackgroundTransitionIsland
        resolvedBg={bg}
        bgDefinitions={bgDefinitions ?? {}}
        transitions={transitions}
      />
    );
  }

  if (bg.type === "backgroundVideo") {
    const vb = bg as BackgroundVideoProps;
    return <BackgroundVideo {...vb} priority={priority} />;
  }
  if (bg.type === "backgroundVariable" && bgVariableNeedsClient(bg as BgVariable)) {
    return <BackgroundVariable {...(bg as BgVariable)} />;
  }
  if (bg.type === "backgroundTransition") {
    type BgTransition = Extract<bgBlock, { type: "backgroundTransition" }>;
    return <BackgroundTransition {...(bg as BgTransition)} />;
  }
  return null;
}

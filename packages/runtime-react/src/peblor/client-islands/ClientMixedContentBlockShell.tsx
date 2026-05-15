"use client";

import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import type { MixedSectionContentBlockIslandProps } from "./MixedSectionContentBlockIsland";

const MixedIsland = dynamic(() =>
  import("./MixedSectionContentBlockIsland").then(
    (mod) =>
      mod.MixedSectionContentBlockIsland as ComponentType<MixedSectionContentBlockIslandProps>
  )
) as ComponentType<MixedSectionContentBlockIslandProps>;

export function ClientMixedContentBlockShell(props: MixedSectionContentBlockIslandProps) {
  return <MixedIsland {...props} />;
}

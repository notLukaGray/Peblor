"use client";

import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import type { MixedSectionColumnIslandProps } from "./MixedSectionColumnIsland";

const MixedIsland = dynamic(() =>
  import("./MixedSectionColumnIsland").then(
    (mod) => mod.MixedSectionColumnIsland as ComponentType<MixedSectionColumnIslandProps>
  )
) as ComponentType<MixedSectionColumnIslandProps>;

export function ClientMixedSectionColumnShell(props: MixedSectionColumnIslandProps) {
  return <MixedIsland {...props} />;
}

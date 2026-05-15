"use client";

import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import type { MixedElementGroupIslandProps } from "./MixedElementGroupIsland";

const MixedIsland = dynamic(() =>
  import("./MixedElementGroupIsland").then(
    (mod) => mod.MixedElementGroupIsland as ComponentType<MixedElementGroupIslandProps>
  )
) as ComponentType<MixedElementGroupIslandProps>;

export function ClientMixedElementGroupShell(props: MixedElementGroupIslandProps) {
  return <MixedIsland {...props} />;
}

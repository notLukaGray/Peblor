"use client";

import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import type { MixedRichTextIslandProps } from "./MixedRichTextIsland";

const MixedIsland = dynamic(() =>
  import("./MixedRichTextIsland").then(
    (mod) => mod.MixedRichTextIsland as ComponentType<MixedRichTextIslandProps>
  )
) as ComponentType<MixedRichTextIslandProps>;

export function ClientMixedRichTextShell(props: MixedRichTextIslandProps) {
  return <MixedIsland {...props} />;
}

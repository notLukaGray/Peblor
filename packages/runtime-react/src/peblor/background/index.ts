import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import type { bgBlock } from "@pb/contracts/types";

const BgVideo = dynamic(() =>
  import("./BackgroundVideo").then((m) => ({ default: m.BackgroundVideo }))
);
const BgImg = dynamic(() =>
  import("./BackgroundImage").then((m) => ({ default: m.BackgroundImage }))
);
const BgVar = dynamic(() =>
  import("./BackgroundVariable").then((m) => ({ default: m.BackgroundVariable }))
);
const BgPat = dynamic(() =>
  import("./BackgroundPattern").then((m) => ({ default: m.BackgroundPattern }))
);
const BgTrans = dynamic(() =>
  import("./BackgroundTransition").then((m) => ({ default: m.BackgroundTransition }))
);

export type KnownBgType =
  | "backgroundVideo"
  | "backgroundImage"
  | "backgroundVariable"
  | "backgroundPattern"
  | "backgroundTransition";

/** Type guard for supported background block types. */
export function isKnownBgType(type: string): type is KnownBgType {
  return (
    type === "backgroundVideo" ||
    type === "backgroundImage" ||
    type === "backgroundVariable" ||
    type === "backgroundPattern" ||
    type === "backgroundTransition"
  );
}

/** Map of background type string → lazy-loaded component. */
export const BG_COMPONENTS: Record<KnownBgType, ComponentType<bgBlock>> = {
  backgroundVideo: BgVideo as unknown as ComponentType<bgBlock>,
  backgroundImage: BgImg as unknown as ComponentType<bgBlock>,
  backgroundVariable: BgVar as unknown as ComponentType<bgBlock>,
  backgroundPattern: BgPat as unknown as ComponentType<bgBlock>,
  backgroundTransition: BgTrans as unknown as ComponentType<bgBlock>,
};

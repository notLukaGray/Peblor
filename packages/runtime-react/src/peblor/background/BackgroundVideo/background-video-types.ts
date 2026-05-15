import type { bgBlock } from "@pb/contracts/types";

export type BackgroundVideoProps = Extract<bgBlock, { type: "backgroundVideo" }>;

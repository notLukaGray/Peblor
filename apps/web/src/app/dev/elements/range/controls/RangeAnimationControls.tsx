import { PbAnimationLabControls } from "@/app/dev/elements/_shared/PbAnimationLabControls";
import type { PbAnimationLabController } from "@/app/dev/elements/_shared/pb-animation-lab-controller";
import type { RangeElementDevController } from "../useRangeElementDevController";

export function RangeAnimationControls({ controller }: { controller: RangeElementDevController }) {
  return <PbAnimationLabControls controller={controller as unknown as PbAnimationLabController} />;
}

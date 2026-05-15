import { PbAnimationLabControls } from "@/app/dev/elements/_shared/PbAnimationLabControls";
import type { PbAnimationLabController } from "@/app/dev/elements/_shared/pb-animation-lab-controller";
import type { VectorElementDevController } from "../useVectorElementDevController";

export function VectorAnimationControls({
  controller,
}: {
  controller: VectorElementDevController;
}) {
  return <PbAnimationLabControls controller={controller as unknown as PbAnimationLabController} />;
}

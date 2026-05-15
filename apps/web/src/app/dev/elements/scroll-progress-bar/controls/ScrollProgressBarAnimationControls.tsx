import { PbAnimationLabControls } from "@/app/dev/elements/_shared/PbAnimationLabControls";
import type { PbAnimationLabController } from "@/app/dev/elements/_shared/pb-animation-lab-controller";
import type { ScrollProgressBarElementDevController } from "../useScrollProgressBarElementDevController";

export function ScrollProgressBarAnimationControls({
  controller,
}: {
  controller: ScrollProgressBarElementDevController;
}) {
  return <PbAnimationLabControls controller={controller as unknown as PbAnimationLabController} />;
}

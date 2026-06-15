import { PbAnimationLabControls } from "@/app/dev/elements/_shared/PbAnimationLabControls";
import type { PbAnimationLabController } from "@/app/dev/elements/_shared/pb-animation-lab-controller";

export function VideoTimeAnimationControls({
  controller,
}: {
  controller: PbAnimationLabController;
}) {
  return <PbAnimationLabControls controller={controller} />;
}

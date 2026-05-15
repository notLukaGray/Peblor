import { PbAnimationLabControls } from "@/app/dev/elements/_shared/PbAnimationLabControls";
import type { PbAnimationLabController } from "@/app/dev/elements/_shared/pb-animation-lab-controller";
import type { VideoTimeElementDevController } from "../useVideoTimeElementDevController";

export function VideoTimeAnimationControls({
  controller,
}: {
  controller: VideoTimeElementDevController;
}) {
  return <PbAnimationLabControls controller={controller as unknown as PbAnimationLabController} />;
}

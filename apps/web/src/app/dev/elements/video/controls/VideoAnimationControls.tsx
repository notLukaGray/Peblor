import { PbAnimationLabControls } from "@/app/dev/elements/_shared/PbAnimationLabControls";
import type { PbAnimationLabController } from "@/app/dev/elements/_shared/pb-animation-lab-controller";
import type { VideoElementDevController } from "../useVideoElementDevController";

export function VideoAnimationControls({ controller }: { controller: VideoElementDevController }) {
  return <PbAnimationLabControls controller={controller as unknown as PbAnimationLabController} />;
}

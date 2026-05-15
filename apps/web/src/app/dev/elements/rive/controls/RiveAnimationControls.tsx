import { PbAnimationLabControls } from "@/app/dev/elements/_shared/PbAnimationLabControls";
import type { PbAnimationLabController } from "@/app/dev/elements/_shared/pb-animation-lab-controller";
import type { RiveElementDevController } from "../useRiveElementDevController";

export function RiveAnimationControls({ controller }: { controller: RiveElementDevController }) {
  return <PbAnimationLabControls controller={controller as unknown as PbAnimationLabController} />;
}

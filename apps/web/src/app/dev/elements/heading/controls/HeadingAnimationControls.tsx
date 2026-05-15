import { PbAnimationLabControls } from "@/app/dev/elements/_shared/PbAnimationLabControls";
import type { PbAnimationLabController } from "@/app/dev/elements/_shared/pb-animation-lab-controller";
import type { HeadingElementDevController } from "../useHeadingElementDevController";

export function HeadingAnimationControls({
  controller,
}: {
  controller: HeadingElementDevController;
}) {
  return <PbAnimationLabControls controller={controller as unknown as PbAnimationLabController} />;
}

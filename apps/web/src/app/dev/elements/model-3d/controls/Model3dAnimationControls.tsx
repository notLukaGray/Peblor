import { PbAnimationLabControls } from "@/app/dev/elements/_shared/PbAnimationLabControls";
import type { PbAnimationLabController } from "@/app/dev/elements/_shared/pb-animation-lab-controller";
import type { Model3dElementDevController } from "../useModel3dElementDevController";

export function Model3dAnimationControls({
  controller,
}: {
  controller: Model3dElementDevController;
}) {
  return <PbAnimationLabControls controller={controller as unknown as PbAnimationLabController} />;
}

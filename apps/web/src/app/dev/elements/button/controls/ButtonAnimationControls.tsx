import { PbAnimationLabControls } from "@/app/dev/elements/_shared/PbAnimationLabControls";
import type { PbAnimationLabController } from "@/app/dev/elements/_shared/pb-animation-lab-controller";
import type { ButtonElementDevController } from "../useButtonElementDevController";

export function ButtonAnimationControls({
  controller,
}: {
  controller: ButtonElementDevController;
}) {
  return <PbAnimationLabControls controller={controller as unknown as PbAnimationLabController} />;
}

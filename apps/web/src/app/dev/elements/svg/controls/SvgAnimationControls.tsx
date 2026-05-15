import { PbAnimationLabControls } from "@/app/dev/elements/_shared/PbAnimationLabControls";
import type { PbAnimationLabController } from "@/app/dev/elements/_shared/pb-animation-lab-controller";
import type { SvgElementDevController } from "../useSvgElementDevController";

export function SvgAnimationControls({ controller }: { controller: SvgElementDevController }) {
  return <PbAnimationLabControls controller={controller as unknown as PbAnimationLabController} />;
}

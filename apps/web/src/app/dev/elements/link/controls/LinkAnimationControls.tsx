import { PbAnimationLabControls } from "@/app/dev/elements/_shared/PbAnimationLabControls";
import type { PbAnimationLabController } from "@/app/dev/elements/_shared/pb-animation-lab-controller";
import type { LinkElementDevController } from "../useLinkElementDevController";

export function LinkAnimationControls({ controller }: { controller: LinkElementDevController }) {
  return <PbAnimationLabControls controller={controller as unknown as PbAnimationLabController} />;
}

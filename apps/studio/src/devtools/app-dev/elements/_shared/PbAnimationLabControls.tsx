import { MOTION_CUSTOM_FIELD_KEYS } from "@/app/dev/elements/_shared/motion-lab";
import type { PbAnimationLabController } from "@/app/dev/elements/_shared/pb-animation-lab-controller";
import { PbAnimationEntranceControls } from "./pb-animation-lab-entrance-controls";
import { PbAnimationExitControls } from "./pb-animation-lab-exit-controls";

export function PbAnimationLabControls({ controller }: { controller: PbAnimationLabController }) {
  const fineTune = controller.active.animation.fineTune;
  const showAnyCustom =
    fineTune.entranceBehavior === "custom" || fineTune.exitBehavior === "custom";
  return (
    <>
      <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <PbAnimationEntranceControls controller={controller} />
        <PbAnimationExitControls controller={controller} />
      </div>
      {showAnyCustom ? (
        <p className="mt-3 text-[10px] leading-snug text-muted-foreground">
          Custom controls map to: {MOTION_CUSTOM_FIELD_KEYS.join(", ")}.
        </p>
      ) : null}
    </>
  );
}

import type { AnimationBehavior } from "@/app/dev/elements/_shared/motion-lab";
import type {
  PbImageAnimationCurvePreset,
  PbImageAnimationDefaults,
  PbImageEntranceFineTune,
  PbImageExitFineTune,
} from "@/app/theme/pb-builder-defaults";

/**
 * Shared interface for animation lab UI controllers.
 *
 * Every element dev controller (image, heading, body, link, button, etc.)
 * should satisfy this interface so the `PbAnimationLabControls` component
 * can accept it directly without casts.
 *
 * All `*AnimationControls.tsx` components now accept `PbAnimationLabController`
 * as their prop type — if a dev controller satisfies this interface structurally,
 * no explicit `extends` clause is needed (TypeScript structural typing).
 *
 * Minimal surface for shared animation lab UI — implemented by image and
 * typography element dev controllers.
 */
export type PbAnimationLabController = {
  active: { animation: PbImageAnimationDefaults };
  activeVariant: string;
  animationBehavior: AnimationBehavior;
  showFineTuneControls: boolean;
  showHybridControls: boolean;
  showPresetControls: boolean;
  setAnimationPatch: (variantKey: string, patch: Partial<PbImageAnimationDefaults>) => void;
  patchEntranceFineTune: (variantKey: string, patch: Partial<PbImageEntranceFineTune>) => void;
  patchExitFineTune: (variantKey: string, patch: Partial<PbImageExitFineTune>) => void;
  setEntranceCurvePreset: (variantKey: string, preset: PbImageAnimationCurvePreset) => void;
  setExitCurvePreset: (variantKey: string, preset: PbImageAnimationCurvePreset) => void;
  setEntranceBezierValue: (variantKey: string, index: number, value: number) => void;
  setExitBezierValue: (variantKey: string, index: number, value: number) => void;
};

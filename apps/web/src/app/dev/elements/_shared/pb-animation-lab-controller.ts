import type { AnimationBehavior } from "@/app/dev/elements/_shared/motion-lab";
import type {
  PbImageAnimationCurvePreset,
  PbImageAnimationDefaults,
  PbImageEntranceFineTune,
  PbImageExitFineTune,
} from "@/app/theme/pb-builder-defaults";

/** Minimal surface for shared animation lab UI — implemented by image and typography element dev controllers. */
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

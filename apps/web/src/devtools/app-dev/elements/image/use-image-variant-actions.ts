import { useCallback, type Dispatch, type SetStateAction } from "react";
import type {
  PbImageAnimationCurvePreset,
  PbImageAnimationDefaults,
  PbImageEntranceFineTune,
  PbImageExitFineTune,
  PbImageVariantDefaults,
  PbImageVariantKey,
} from "@/app/theme/pb-builder-defaults";

type SetVariants = Dispatch<SetStateAction<Record<PbImageVariantKey, PbImageVariantDefaults>>>;

export function useImageVariantActions(setVariants: SetVariants) {
  const updateVariant = useCallback(
    (
      key: PbImageVariantKey,
      apply: (variant: PbImageVariantDefaults) => PbImageVariantDefaults
    ) => {
      setVariants((prev) => ({ ...prev, [key]: apply(prev[key]) }));
    },
    [setVariants]
  );

  const setVariantPatch = useCallback(
    (key: PbImageVariantKey, patch: Partial<PbImageVariantDefaults>) =>
      updateVariant(key, (variant) => ({ ...variant, ...patch })),
    [updateVariant]
  );

  const setVariantExact = useCallback(
    (key: PbImageVariantKey, nextVariant: PbImageVariantDefaults) =>
      updateVariant(key, () => nextVariant),
    [updateVariant]
  );

  const setAnimationPatch = useCallback(
    (key: PbImageVariantKey, patch: Partial<PbImageAnimationDefaults>) =>
      updateVariant(key, (variant) => ({
        ...variant,
        animation: { ...variant.animation, ...patch },
      })),
    [updateVariant]
  );

  const patchEntranceFineTune = useCallback(
    (key: PbImageVariantKey, patch: Partial<PbImageEntranceFineTune>) =>
      updateVariant(key, (variant) => ({
        ...variant,
        animation: {
          ...variant.animation,
          fineTune: {
            ...variant.animation.fineTune,
            entrance: { ...variant.animation.fineTune.entrance, ...patch },
          },
        },
      })),
    [updateVariant]
  );

  const patchExitFineTune = useCallback(
    (key: PbImageVariantKey, patch: Partial<PbImageExitFineTune>) =>
      updateVariant(key, (variant) => ({
        ...variant,
        animation: {
          ...variant.animation,
          fineTune: {
            ...variant.animation.fineTune,
            exit: { ...variant.animation.fineTune.exit, ...patch },
          },
        },
      })),
    [updateVariant]
  );

  const setEntranceCurvePreset = useCallback(
    (key: PbImageVariantKey, preset: PbImageAnimationCurvePreset) =>
      updateVariant(key, (variant) => ({
        ...variant,
        animation: {
          ...variant.animation,
          fineTune: {
            ...variant.animation.fineTune,
            entrance: {
              ...variant.animation.fineTune.entrance,
              curve: { ...variant.animation.fineTune.entrance.curve, preset },
            },
          },
        },
      })),
    [updateVariant]
  );

  const setExitCurvePreset = useCallback(
    (key: PbImageVariantKey, preset: PbImageAnimationCurvePreset) =>
      updateVariant(key, (variant) => ({
        ...variant,
        animation: {
          ...variant.animation,
          fineTune: {
            ...variant.animation.fineTune,
            exit: {
              ...variant.animation.fineTune.exit,
              curve: { ...variant.animation.fineTune.exit.curve, preset },
            },
          },
        },
      })),
    [updateVariant]
  );

  const setEntranceBezierValue = useCallback(
    (key: PbImageVariantKey, index: number, value: number) =>
      updateVariant(key, (variant) => ({
        ...variant,
        animation: {
          ...variant.animation,
          fineTune: {
            ...variant.animation.fineTune,
            entrance: {
              ...variant.animation.fineTune.entrance,
              curve: {
                ...variant.animation.fineTune.entrance.curve,
                customBezier: variant.animation.fineTune.entrance.curve.customBezier.map(
                  (entry, i) => (i === index ? value : entry)
                ) as [number, number, number, number],
              },
            },
          },
        },
      })),
    [updateVariant]
  );

  const setExitBezierValue = useCallback(
    (key: PbImageVariantKey, index: number, value: number) =>
      updateVariant(key, (variant) => ({
        ...variant,
        animation: {
          ...variant.animation,
          fineTune: {
            ...variant.animation.fineTune,
            exit: {
              ...variant.animation.fineTune.exit,
              curve: {
                ...variant.animation.fineTune.exit.curve,
                customBezier: variant.animation.fineTune.exit.curve.customBezier.map((entry, i) =>
                  i === index ? value : entry
                ) as [number, number, number, number],
              },
            },
          },
        },
      })),
    [updateVariant]
  );

  return {
    setVariantPatch,
    setVariantExact,
    setAnimationPatch,
    patchEntranceFineTune,
    patchExitFineTune,
    setEntranceCurvePreset,
    setExitCurvePreset,
    setEntranceBezierValue,
    setExitBezierValue,
  };
}

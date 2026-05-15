import type { PbImageVariantDefaults } from "@/app/theme/pb-builder-defaults";
import {
  hasMobileOverride,
  resolveConstraintsForDevice,
  resolveResponsiveValueForDevice,
} from "@/app/dev/elements/_shared/responsive-layout-value";
import {
  AlignmentFields,
  ConstraintsFields,
  WidthHeightFields,
  ZIndexField,
} from "./shared-layout-sizing-sections";
import type {
  AlignX,
  AlignY,
  ConstraintsState,
  ResponsiveChoiceState,
  ResponsiveTextState,
} from "./shared-layout-sizing-types";

type Props = {
  variant: PbImageVariantDefaults;
  showWidthHeightFields: boolean;
  showAlignmentControls: boolean;
  showConstraintsEditor: boolean;
  onPatch: (patch: Partial<PbImageVariantDefaults>) => void;
  widthPlaceholderDesktop?: string;
  heightPlaceholderDesktop?: string;
};

function readResponsiveTextState(value: PbImageVariantDefaults["width"]): ResponsiveTextState {
  const desktop = resolveResponsiveValueForDevice(value, "desktop") ?? "";
  return {
    desktop,
    mobile: resolveResponsiveValueForDevice(value, "mobile") ?? desktop,
    hasMobile: hasMobileOverride(value),
  };
}

function readResponsiveChoiceState<TValue extends string>(
  value: PbImageVariantDefaults["align"] | PbImageVariantDefaults["alignY"],
  fallback: TValue
): ResponsiveChoiceState<TValue> {
  const desktop = (resolveResponsiveValueForDevice(value, "desktop") ?? fallback) as TValue;
  return {
    desktop,
    mobile: (resolveResponsiveValueForDevice(value, "mobile") ?? desktop) as TValue,
    hasMobile: hasMobileOverride(value),
  };
}

function readConstraintsState(value: PbImageVariantDefaults["constraints"]): ConstraintsState {
  const desktop = resolveConstraintsForDevice(value, "desktop") ?? {};
  return {
    desktop,
    mobile: resolveConstraintsForDevice(value, "mobile") ?? desktop,
    hasMobile: hasMobileOverride(value),
  };
}

export function SharedLayoutSizingFields({
  variant,
  showWidthHeightFields,
  showAlignmentControls,
  showConstraintsEditor,
  onPatch,
  widthPlaceholderDesktop = "e.g. 100%",
  heightPlaceholderDesktop = "e.g. 100%",
}: Props) {
  const width = readResponsiveTextState(variant.width);
  const height = readResponsiveTextState(variant.height);
  const align = readResponsiveChoiceState<AlignX>(variant.align, "center");
  const alignY = readResponsiveChoiceState<AlignY>(variant.alignY, "center");
  const constraints = readConstraintsState(variant.constraints);

  return (
    <>
      <WidthHeightFields
        show={showWidthHeightFields}
        variant={variant}
        onPatch={onPatch}
        width={width}
        height={height}
        widthPlaceholderDesktop={widthPlaceholderDesktop}
        heightPlaceholderDesktop={heightPlaceholderDesktop}
      />
      <AlignmentFields
        show={showAlignmentControls}
        variant={variant}
        onPatch={onPatch}
        align={align}
        alignY={alignY}
      />
      <ZIndexField value={variant.zIndex} onPatch={onPatch} />
      <ConstraintsFields
        show={showConstraintsEditor}
        variant={variant}
        onPatch={onPatch}
        constraints={constraints}
      />
    </>
  );
}

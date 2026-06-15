import type { ReactNode } from "react";
import type { PbResponsiveValue } from "@/app/theme/pb-builder-defaults";
import {
  hasMobileOverride,
  resolveResponsiveValueForDevice,
  setDesktopResponsiveValue,
  setMobileResponsiveValue,
  toggleMobileOverride,
} from "@/app/dev/elements/_shared/responsive-layout-value";
import { ResponsiveTextField } from "./field-primitives";

export type FoundationLayoutMarginsShape = {
  borderRadius?: PbResponsiveValue<string>;
  marginTop?: PbResponsiveValue<string>;
  marginBottom?: PbResponsiveValue<string>;
  marginLeft?: PbResponsiveValue<string>;
  marginRight?: PbResponsiveValue<string>;
};

type Props<T extends FoundationLayoutMarginsShape> = {
  variant: T;
  onPatch: (patch: Partial<T>) => void;
  intro?: ReactNode;
};

type ResponsiveTextState = {
  desktop: string;
  mobile: string;
  hasMobile: boolean;
};

function readResponsiveTextState(
  value: PbResponsiveValue<string> | undefined
): ResponsiveTextState {
  const desktop = resolveResponsiveValueForDevice(value, "desktop") ?? "";
  return {
    desktop,
    mobile: resolveResponsiveValueForDevice(value, "mobile") ?? desktop,
    hasMobile: hasMobileOverride(value),
  };
}

export function SharedFoundationLayoutFields<T extends FoundationLayoutMarginsShape>({
  variant,
  onPatch,
  intro,
}: Props<T>) {
  const border = readResponsiveTextState(variant.borderRadius);
  const marginTop = readResponsiveTextState(variant.marginTop);
  const marginBottom = readResponsiveTextState(variant.marginBottom);
  const marginLeft = readResponsiveTextState(variant.marginLeft);
  const marginRight = readResponsiveTextState(variant.marginRight);

  return (
    <>
      {intro}
      <ResponsiveTextField
        label="Border radius"
        desktopValue={border.desktop}
        mobileValue={border.mobile}
        hasMobile={border.hasMobile}
        placeholderDesktop="e.g. 0.375rem"
        onToggleMobile={(enabled) =>
          onPatch({
            borderRadius:
              toggleMobileOverride(variant.borderRadius, enabled, border.desktop) ?? border.desktop,
          } as Partial<T>)
        }
        onDesktopChange={(value) =>
          onPatch({
            borderRadius: setDesktopResponsiveValue(variant.borderRadius, value),
          } as Partial<T>)
        }
        onMobileChange={(value) =>
          onPatch({
            borderRadius: setMobileResponsiveValue(variant.borderRadius, value, border.desktop),
          } as Partial<T>)
        }
      />

      <ResponsiveTextField
        label="Margin top"
        desktopValue={marginTop.desktop}
        mobileValue={marginTop.mobile}
        hasMobile={marginTop.hasMobile}
        placeholderDesktop="optional"
        onToggleMobile={(enabled) =>
          onPatch({
            marginTop: toggleMobileOverride(variant.marginTop, enabled, marginTop.desktop),
          } as Partial<T>)
        }
        onDesktopChange={(value) =>
          onPatch({ marginTop: setDesktopResponsiveValue(variant.marginTop, value) } as Partial<T>)
        }
        onMobileChange={(value) =>
          onPatch({
            marginTop: setMobileResponsiveValue(variant.marginTop, value, marginTop.desktop),
          } as Partial<T>)
        }
      />
      <ResponsiveTextField
        label="Margin bottom"
        desktopValue={marginBottom.desktop}
        mobileValue={marginBottom.mobile}
        hasMobile={marginBottom.hasMobile}
        placeholderDesktop="optional"
        onToggleMobile={(enabled) =>
          onPatch({
            marginBottom: toggleMobileOverride(variant.marginBottom, enabled, marginBottom.desktop),
          } as Partial<T>)
        }
        onDesktopChange={(value) =>
          onPatch({
            marginBottom: setDesktopResponsiveValue(variant.marginBottom, value),
          } as Partial<T>)
        }
        onMobileChange={(value) =>
          onPatch({
            marginBottom: setMobileResponsiveValue(
              variant.marginBottom,
              value,
              marginBottom.desktop
            ),
          } as Partial<T>)
        }
      />
      <ResponsiveTextField
        label="Margin left"
        desktopValue={marginLeft.desktop}
        mobileValue={marginLeft.mobile}
        hasMobile={marginLeft.hasMobile}
        placeholderDesktop="optional"
        onToggleMobile={(enabled) =>
          onPatch({
            marginLeft: toggleMobileOverride(variant.marginLeft, enabled, marginLeft.desktop),
          } as Partial<T>)
        }
        onDesktopChange={(value) =>
          onPatch({
            marginLeft: setDesktopResponsiveValue(variant.marginLeft, value),
          } as Partial<T>)
        }
        onMobileChange={(value) =>
          onPatch({
            marginLeft: setMobileResponsiveValue(variant.marginLeft, value, marginLeft.desktop),
          } as Partial<T>)
        }
      />
      <ResponsiveTextField
        label="Margin right"
        desktopValue={marginRight.desktop}
        mobileValue={marginRight.mobile}
        hasMobile={marginRight.hasMobile}
        placeholderDesktop="optional"
        onToggleMobile={(enabled) =>
          onPatch({
            marginRight: toggleMobileOverride(variant.marginRight, enabled, marginRight.desktop),
          } as Partial<T>)
        }
        onDesktopChange={(value) =>
          onPatch({
            marginRight: setDesktopResponsiveValue(variant.marginRight, value),
          } as Partial<T>)
        }
        onMobileChange={(value) =>
          onPatch({
            marginRight: setMobileResponsiveValue(variant.marginRight, value, marginRight.desktop),
          } as Partial<T>)
        }
      />
    </>
  );
}

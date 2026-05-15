import type { PbResponsiveValue } from "@/app/theme/pb-builder-defaults";
import {
  hasMobileOverride,
  resolveResponsiveValueForDevice,
  setDesktopResponsiveValue,
  setMobileResponsiveValue,
  toggleMobileOverride,
} from "@/app/dev/elements/_shared/responsive-layout-value";
import { ALIGN_OPTIONS, ALIGN_Y_OPTIONS, TEXT_ALIGN_OPTIONS } from "./foundation-constants";
import { ResponsiveSelectField, ResponsiveTextField } from "./field-primitives";

export type TypographySizingShape = {
  width?: PbResponsiveValue<string>;
  height?: PbResponsiveValue<string>;
  align?: PbResponsiveValue<"left" | "center" | "right" | "full">;
  alignY?: PbResponsiveValue<"top" | "center" | "bottom">;
  textAlign?: PbResponsiveValue<"left" | "center" | "right" | "justify">;
  zIndex?: number;
};

type Props<T extends TypographySizingShape> = {
  variant: T;
  onPatch: (patch: Partial<T>) => void;
};

type ResponsiveValueState<TValue extends string> = {
  desktop: TValue;
  mobile: TValue;
  hasMobile: boolean;
};

function readResponsiveState<TValue extends string>(
  value: PbResponsiveValue<TValue> | undefined,
  fallback: TValue
): ResponsiveValueState<TValue> {
  const desktop = resolveResponsiveValueForDevice(value, "desktop") ?? fallback;
  return {
    desktop,
    mobile: resolveResponsiveValueForDevice(value, "mobile") ?? desktop,
    hasMobile: hasMobileOverride(value),
  };
}

export function SharedTypographySizingFields<T extends TypographySizingShape>({
  variant,
  onPatch,
}: Props<T>) {
  const width = readResponsiveState(variant.width, "");
  const height = readResponsiveState(variant.height, "");
  const align = readResponsiveState(variant.align, "center");
  const alignY = readResponsiveState(variant.alignY, "center");
  const textAlign = readResponsiveState(variant.textAlign, "left");

  return (
    <>
      <ResponsiveTextField
        label="Width"
        desktopValue={width.desktop}
        mobileValue={width.mobile}
        hasMobile={width.hasMobile}
        placeholderDesktop="optional"
        placeholderMobile="mobile width"
        onToggleMobile={(enabled) =>
          onPatch({
            width: toggleMobileOverride(variant.width, enabled, width.desktop),
          } as Partial<T>)
        }
        onDesktopChange={(value) =>
          onPatch({ width: setDesktopResponsiveValue(variant.width, value) } as Partial<T>)
        }
        onMobileChange={(value) =>
          onPatch({
            width: setMobileResponsiveValue(variant.width, value, width.desktop),
          } as Partial<T>)
        }
      />
      <ResponsiveTextField
        label="Height"
        desktopValue={height.desktop}
        mobileValue={height.mobile}
        hasMobile={height.hasMobile}
        placeholderDesktop="optional"
        placeholderMobile="mobile height"
        onToggleMobile={(enabled) =>
          onPatch({
            height: toggleMobileOverride(variant.height, enabled, height.desktop),
          } as Partial<T>)
        }
        onDesktopChange={(value) =>
          onPatch({ height: setDesktopResponsiveValue(variant.height, value) } as Partial<T>)
        }
        onMobileChange={(value) =>
          onPatch({
            height: setMobileResponsiveValue(variant.height, value, height.desktop),
          } as Partial<T>)
        }
      />

      <ResponsiveSelectField
        label="Align X"
        options={ALIGN_OPTIONS}
        desktopValue={align.desktop}
        mobileValue={align.mobile}
        hasMobile={align.hasMobile}
        onToggleMobile={(enabled) =>
          onPatch({
            align: toggleMobileOverride(variant.align, enabled, align.desktop),
          } as Partial<T>)
        }
        onDesktopChange={(value) =>
          onPatch({
            align: setDesktopResponsiveValue(variant.align, value as "left" | "center" | "right"),
          } as Partial<T>)
        }
        onMobileChange={(value) =>
          onPatch({
            align: setMobileResponsiveValue(
              variant.align,
              value as "left" | "center" | "right",
              align.desktop as "left" | "center" | "right"
            ),
          } as Partial<T>)
        }
      />
      <ResponsiveSelectField
        label="Align Y"
        options={ALIGN_Y_OPTIONS}
        desktopValue={alignY.desktop}
        mobileValue={alignY.mobile}
        hasMobile={alignY.hasMobile}
        onToggleMobile={(enabled) =>
          onPatch({
            alignY: toggleMobileOverride(variant.alignY, enabled, alignY.desktop),
          } as Partial<T>)
        }
        onDesktopChange={(value) =>
          onPatch({
            alignY: setDesktopResponsiveValue(variant.alignY, value as "top" | "center" | "bottom"),
          } as Partial<T>)
        }
        onMobileChange={(value) =>
          onPatch({
            alignY: setMobileResponsiveValue(
              variant.alignY,
              value as "top" | "center" | "bottom",
              alignY.desktop as "top" | "center" | "bottom"
            ),
          } as Partial<T>)
        }
      />
      <ResponsiveSelectField
        label="Text align"
        options={TEXT_ALIGN_OPTIONS}
        desktopValue={textAlign.desktop}
        mobileValue={textAlign.mobile}
        hasMobile={textAlign.hasMobile}
        onToggleMobile={(enabled) =>
          onPatch({
            textAlign: toggleMobileOverride(variant.textAlign, enabled, textAlign.desktop),
          } as Partial<T>)
        }
        onDesktopChange={(value) =>
          onPatch({
            textAlign: setDesktopResponsiveValue(
              variant.textAlign,
              value as "left" | "center" | "right" | "justify"
            ),
          } as Partial<T>)
        }
        onMobileChange={(value) =>
          onPatch({
            textAlign: setMobileResponsiveValue(
              variant.textAlign,
              value as "left" | "center" | "right" | "justify",
              textAlign.desktop as "left" | "center" | "right" | "justify"
            ),
          } as Partial<T>)
        }
      />

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Z-index
        </span>
        <input
          type="number"
          step={1}
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/70"
          value={variant.zIndex ?? ""}
          placeholder="optional"
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "" || raw === "-") {
              onPatch({ zIndex: undefined } as Partial<T>);
              return;
            }
            const n = Number(raw);
            if (Number.isFinite(n)) onPatch({ zIndex: n } as Partial<T>);
          }}
        />
      </label>
    </>
  );
}

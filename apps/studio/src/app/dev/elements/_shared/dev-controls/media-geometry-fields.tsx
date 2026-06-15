import type { PbImageVariantDefaults } from "@/app/theme/pb-builder-defaults";
import {
  hasMobileOverride,
  resolveResponsiveValueForDevice,
  setDesktopResponsiveValue,
  setMobileResponsiveValue,
  toggleMobileOverride,
} from "@/app/dev/elements/_shared/responsive-layout-value";
import { OBJECT_FIT_OPTIONS } from "./foundation-constants";
import { ResponsiveSelectField, ResponsiveTextField } from "./field-primitives";

type Props = {
  variant: PbImageVariantDefaults;
  showAspectRatioField: boolean;
  showObjectPositionField: boolean;
  onPatch: (patch: Partial<PbImageVariantDefaults>) => void;
};

export function MediaGeometryFields({
  variant,
  showAspectRatioField,
  showObjectPositionField,
  onPatch,
}: Props) {
  const objectFitDesktop = resolveResponsiveValueForDevice(variant.objectFit, "desktop") ?? "cover";
  const objectFitMobile =
    resolveResponsiveValueForDevice(variant.objectFit, "mobile") ?? objectFitDesktop;
  const objectFitHasMobile = hasMobileOverride(variant.objectFit);

  const aspectDesktop = resolveResponsiveValueForDevice(variant.aspectRatio, "desktop") ?? "";
  const aspectMobile =
    resolveResponsiveValueForDevice(variant.aspectRatio, "mobile") ?? aspectDesktop;
  const aspectHasMobile = hasMobileOverride(variant.aspectRatio);

  return (
    <>
      <ResponsiveSelectField
        label="Object fit"
        hasMobile={objectFitHasMobile}
        desktopValue={objectFitDesktop}
        mobileValue={objectFitMobile}
        options={OBJECT_FIT_OPTIONS}
        onToggleMobile={(enabled) =>
          onPatch({
            objectFit: toggleMobileOverride(
              variant.objectFit,
              enabled,
              objectFitDesktop
            ) as PbImageVariantDefaults["objectFit"],
          })
        }
        onDesktopChange={(value) =>
          onPatch({
            objectFit: setDesktopResponsiveValue(
              variant.objectFit,
              value
            ) as PbImageVariantDefaults["objectFit"],
          })
        }
        onMobileChange={(value) =>
          onPatch({
            objectFit: setMobileResponsiveValue(
              variant.objectFit,
              value,
              objectFitDesktop
            ) as PbImageVariantDefaults["objectFit"],
          })
        }
      />

      {showAspectRatioField ? (
        <ResponsiveTextField
          label="Aspect ratio"
          desktopValue={aspectDesktop}
          mobileValue={aspectMobile}
          hasMobile={aspectHasMobile}
          placeholderDesktop="e.g. 16 / 9"
          placeholderMobile="mobile ratio"
          onToggleMobile={(enabled) =>
            onPatch({
              aspectRatio: toggleMobileOverride(variant.aspectRatio, enabled, aspectDesktop),
            })
          }
          onDesktopChange={(value) =>
            onPatch({ aspectRatio: setDesktopResponsiveValue(variant.aspectRatio, value) })
          }
          onMobileChange={(value) =>
            onPatch({
              aspectRatio: setMobileResponsiveValue(variant.aspectRatio, value, aspectDesktop),
            })
          }
        />
      ) : null}

      {showObjectPositionField ? (
        <label className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Object position
          </span>
          <input
            type="text"
            className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-ring"
            value={variant.objectPosition ?? ""}
            onChange={(e) => onPatch({ objectPosition: e.target.value })}
            placeholder="e.g. center top"
          />
        </label>
      ) : (
        <div className="rounded border border-border/60 bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground">
          Object position is hidden for this layout/fit combo because no crop focus is needed.
        </div>
      )}
    </>
  );
}

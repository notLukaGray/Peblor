import type { PbImageVariantDefaults } from "@/app/theme/pb-builder-defaults";
import {
  setDesktopConstraintField,
  setDesktopResponsiveValue,
  setMobileConstraintField,
  setMobileResponsiveValue,
  toggleConstraintsMobileOverride,
  toggleMobileOverride,
  type ConstraintField,
} from "@/app/dev/elements/_shared/responsive-layout-value";
import { ALIGN_OPTIONS, ALIGN_Y_OPTIONS } from "./foundation-constants";
import { ConstraintField as ConstraintFieldControl } from "./constraint-field";
import { ResponsiveSelectField, ResponsiveTextField } from "./field-primitives";
import type {
  AlignX,
  AlignY,
  ConstraintsState,
  ResponsiveChoiceState,
  ResponsiveTextState,
} from "./shared-layout-sizing-types";

const CONSTRAINT_FIELDS: Array<{ field: ConstraintField; label: string }> = [
  { field: "minWidth", label: "Min width" },
  { field: "minHeight", label: "Min height" },
  { field: "maxWidth", label: "Max width" },
  { field: "maxHeight", label: "Max height" },
];

export function WidthHeightFields({
  show,
  variant,
  onPatch,
  width,
  height,
  widthPlaceholderDesktop,
  heightPlaceholderDesktop,
}: {
  show: boolean;
  variant: PbImageVariantDefaults;
  onPatch: (patch: Partial<PbImageVariantDefaults>) => void;
  width: ResponsiveTextState;
  height: ResponsiveTextState;
  widthPlaceholderDesktop: string;
  heightPlaceholderDesktop: string;
}) {
  if (!show) return null;
  return (
    <>
      <ResponsiveTextField
        label="Width"
        desktopValue={width.desktop}
        mobileValue={width.mobile}
        hasMobile={width.hasMobile}
        placeholderDesktop={widthPlaceholderDesktop}
        placeholderMobile="mobile width"
        onToggleMobile={(enabled) =>
          onPatch({ width: toggleMobileOverride(variant.width, enabled, width.desktop) })
        }
        onDesktopChange={(value) =>
          onPatch({ width: setDesktopResponsiveValue(variant.width, value) })
        }
        onMobileChange={(value) =>
          onPatch({ width: setMobileResponsiveValue(variant.width, value, width.desktop) })
        }
      />
      <ResponsiveTextField
        label="Height"
        desktopValue={height.desktop}
        mobileValue={height.mobile}
        hasMobile={height.hasMobile}
        placeholderDesktop={heightPlaceholderDesktop}
        placeholderMobile="mobile height"
        onToggleMobile={(enabled) =>
          onPatch({ height: toggleMobileOverride(variant.height, enabled, height.desktop) })
        }
        onDesktopChange={(value) =>
          onPatch({ height: setDesktopResponsiveValue(variant.height, value) })
        }
        onMobileChange={(value) =>
          onPatch({ height: setMobileResponsiveValue(variant.height, value, height.desktop) })
        }
      />
    </>
  );
}

export function AlignmentFields({
  show,
  variant,
  onPatch,
  align,
  alignY,
}: {
  show: boolean;
  variant: PbImageVariantDefaults;
  onPatch: (patch: Partial<PbImageVariantDefaults>) => void;
  align: ResponsiveChoiceState<AlignX>;
  alignY: ResponsiveChoiceState<AlignY>;
}) {
  if (!show) {
    return (
      <div className="rounded border border-border/60 bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground">
        Alignment appears when using fill, constraints, or explicit width and height sizing.
      </div>
    );
  }
  return (
    <>
      <ResponsiveSelectField
        label="Align X"
        options={ALIGN_OPTIONS}
        desktopValue={align.desktop}
        mobileValue={align.mobile}
        hasMobile={align.hasMobile}
        onToggleMobile={(enabled) =>
          onPatch({ align: toggleMobileOverride(variant.align, enabled, align.desktop) })
        }
        onDesktopChange={(value) =>
          onPatch({ align: setDesktopResponsiveValue(variant.align, value as AlignX) })
        }
        onMobileChange={(value) =>
          onPatch({
            align: setMobileResponsiveValue(variant.align, value as AlignX, align.desktop),
          })
        }
      />
      <ResponsiveSelectField
        label="Align Y"
        options={ALIGN_Y_OPTIONS}
        desktopValue={alignY.desktop}
        mobileValue={alignY.mobile}
        hasMobile={alignY.hasMobile}
        onToggleMobile={(enabled) =>
          onPatch({ alignY: toggleMobileOverride(variant.alignY, enabled, alignY.desktop) })
        }
        onDesktopChange={(value) =>
          onPatch({ alignY: setDesktopResponsiveValue(variant.alignY, value as AlignY) })
        }
        onMobileChange={(value) =>
          onPatch({
            alignY: setMobileResponsiveValue(variant.alignY, value as AlignY, alignY.desktop),
          })
        }
      />
    </>
  );
}

export function ZIndexField({
  value,
  onPatch,
}: {
  value: number | undefined;
  onPatch: (patch: Partial<PbImageVariantDefaults>) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        Z-index
      </span>
      <input
        type="number"
        step={1}
        className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/70"
        value={value ?? ""}
        placeholder="optional"
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "" || raw === "-") {
            onPatch({ zIndex: undefined });
            return;
          }
          const parsed = Number(raw);
          if (Number.isFinite(parsed)) onPatch({ zIndex: parsed });
        }}
      />
    </label>
  );
}

export function ConstraintsFields({
  show,
  variant,
  onPatch,
  constraints,
}: {
  show: boolean;
  variant: PbImageVariantDefaults;
  onPatch: (patch: Partial<PbImageVariantDefaults>) => void;
  constraints: ConstraintsState;
}) {
  if (!show) return null;
  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-background/60 px-3 py-2">
        <label className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
          <input
            type="checkbox"
            checked={constraints.hasMobile}
            onChange={(e) =>
              onPatch({
                constraints: toggleConstraintsMobileOverride(variant.constraints, e.target.checked),
              })
            }
          />
          Mobile override
        </label>
      </div>
      {CONSTRAINT_FIELDS.map((entry) => (
        <ConstraintFieldControl
          key={entry.field}
          field={entry.field}
          label={entry.label}
          desktop={constraints.desktop?.[entry.field] ?? ""}
          mobile={constraints.mobile?.[entry.field] ?? ""}
          hasMobile={constraints.hasMobile}
          onDesktopChange={(field, value) =>
            onPatch({ constraints: setDesktopConstraintField(variant.constraints, field, value) })
          }
          onMobileChange={(field, value) =>
            onPatch({ constraints: setMobileConstraintField(variant.constraints, field, value) })
          }
        />
      ))}
    </>
  );
}

import {
  ResponsiveTextField,
  SharedFoundationLayoutFields,
} from "@/app/dev/elements/_shared/dev-controls";
import {
  hasMobileOverride,
  resolveResponsiveValueForDevice,
  setDesktopResponsiveValue,
  setMobileResponsiveValue,
  toggleMobileOverride,
} from "@/app/dev/elements/_shared/responsive-layout-value";
import type { PbResponsiveValue } from "@/app/theme/pb-builder-defaults";
import type { ButtonVariantDefaults } from "../types";
import type { ButtonElementDevController } from "../useButtonElementDevController";

type WrapperSizingKey =
  | "wrapperPadding"
  | "wrapperBorderRadius"
  | "wrapperWidth"
  | "wrapperHeight"
  | "wrapperMinWidth"
  | "wrapperMinHeight";

const WRAPPER_SIZING_FIELDS: {
  key: WrapperSizingKey;
  label: string;
  placeholder: string;
}[] = [
  { key: "wrapperPadding", label: "Wrapper padding", placeholder: "e.g. 0.5rem 1rem" },
  { key: "wrapperBorderRadius", label: "Wrapper radius", placeholder: "e.g. 0.5rem, 9999px" },
  { key: "wrapperWidth", label: "Wrapper width", placeholder: "e.g. 10rem, 100%" },
  { key: "wrapperHeight", label: "Wrapper height", placeholder: "e.g. 2.75rem, 44px" },
  { key: "wrapperMinWidth", label: "Wrapper min-width", placeholder: "e.g. 8rem" },
  { key: "wrapperMinHeight", label: "Wrapper min-height", placeholder: "e.g. 2.75rem, 44px" },
];

export function ButtonLayoutControls({ controller }: { controller: ButtonElementDevController }) {
  const { active, activeVariant, setVariantPatch } = controller;
  const patch = (p: Partial<ButtonVariantDefaults>) => setVariantPatch(activeVariant, p);

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Layout
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Shared layout controls for spacing, width/height, and border radius.
        </p>
      </div>

      <SharedFoundationLayoutFields<ButtonVariantDefaults>
        variant={active}
        onPatch={(p) => setVariantPatch(activeVariant, p)}
      />

      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Wrapper sizing
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Padding and radius shape the pill. Width/height fix it to an explicit size. Use{" "}
          <code>min-</code> variants to enforce a tap target without removing flexibility. All
          fields support mobile overrides.
        </p>
      </div>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Wrapper stroke width (px)
        </span>
        <input
          type="number"
          min={0}
          max={48}
          step={1}
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.wrapperStrokeWidth ?? ""}
          placeholder={`default ${2}`}
          onChange={(e) => {
            const raw = e.target.value;
            patch({
              wrapperStrokeWidth:
                raw === "" || raw === "-"
                  ? undefined
                  : Math.round(Math.min(Math.max(Number(raw), 0), 48)),
            });
          }}
        />
        <p className="text-[10px] text-muted-foreground">
          Border thickness when <span className="font-mono">wrapperStroke</span> is set. Leave empty
          for the default (2px).
        </p>
      </label>

      {WRAPPER_SIZING_FIELDS.map(({ key, label, placeholder }) => {
        const value = active[key] as PbResponsiveValue<string> | undefined;
        const desktop = resolveResponsiveValueForDevice(value, "desktop") ?? "";
        const mobile = resolveResponsiveValueForDevice(value, "mobile") ?? desktop;
        const hasMobile = hasMobileOverride(value);
        return (
          <ResponsiveTextField
            key={key}
            label={label}
            desktopValue={desktop}
            mobileValue={mobile}
            hasMobile={hasMobile}
            placeholderDesktop={placeholder}
            onToggleMobile={(enabled) =>
              patch({ [key]: toggleMobileOverride(value, enabled, desktop) || undefined })
            }
            onDesktopChange={(v) =>
              patch({ [key]: setDesktopResponsiveValue(value, v) || undefined })
            }
            onMobileChange={(v) =>
              patch({ [key]: setMobileResponsiveValue(value, v, desktop) || undefined })
            }
          />
        );
      })}
    </>
  );
}

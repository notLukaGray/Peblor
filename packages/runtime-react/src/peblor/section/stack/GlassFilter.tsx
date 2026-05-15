"use client";

import { useMemo } from "react";
import { calculateDisplacementMap, calculateDisplacementMap2 } from "./lib/displacement-map";
import { calculateRefractionSpecular } from "./lib/specular";
import { calculateMagnifyingDisplacementMap } from "./lib/magnifying-displacement-map";
import { CONCAVE, CONVEX, CONVEX_CIRCLE, LIP } from "./lib/surface-equations";
import { imageDataToUrl } from "./lib/image-data-to-url";
import type { GlassCornerRadii } from "./glass-effect-utils";

type GlassBezelType = "convex_circle" | "convex_squircle" | "concave" | "lip";

type Props = {
  id: string;
  width: number;
  height: number;
  radius: number;
  cornerRadii?: GlassCornerRadii;
  bezelWidth: number;
  bezelType?: GlassBezelType;
  glassThickness: number;
  refractiveIndex: number;
  blur: number;
  scaleRatio?: number;
  specularOpacity: number;
  specularSaturation?: number;
  magnifyingScale?: number;
  /** Light angle in radians. Controls where the specular highlight appears on the bezel. */
  specularAngle?: number;
  /**
   * Chromatic dispersion intensity (0–1). Splits R/G/B channels across slightly
   * different displacement scales to produce a prismatic fringe at the glass edge.
   * Set to 0 (or omit) to disable entirely.
   *
   * TO REMOVE: delete this prop, delete the DISPERSION BLOCK comment section in the
   * JSX below, and remove the `dispersionShift` variable and `in` ternary on the
   * saturation node.
   */
  dispersionScale?: number;
};

/**
 * Renders a hidden SVG containing an SVG <filter> that applies physics-based
 * glass refraction + specular highlight via feDisplacementMap.
 *
 * Apply via: `backdropFilter: url(#<id>)` on the glass surface div.
 * The live compositor content is displaced — no html2canvas, no WebGL, no snapshots.
 */
export function GlassFilter({
  id,
  width,
  height,
  radius,
  cornerRadii,
  bezelWidth,
  bezelType = "convex_squircle",
  glassThickness,
  refractiveIndex,
  blur,
  scaleRatio = 1,
  specularOpacity,
  specularSaturation = 4,
  magnifyingScale,
  specularAngle,
  dispersionScale = 0,
}: Props) {
  // DISPERSION: fraction of scale separating R vs B displacement. 0 = disabled.
  // 0.5 = 50% spread at dispersionScale=1 (R at 0.5×scale, B at 1.5×scale).
  // Zero in the flat center (map value=0 there), max at the bezel — inherently edge-only.
  // Remove this line + JSX block to strip dispersion.
  const dispersionFraction = dispersionScale * 0.5;
  const { displacementMapUrl, specularUrl, magnifyingMapUrl, scale } = useMemo(() => {
    const surfaceFn =
      bezelType === "convex_circle"
        ? CONVEX_CIRCLE.fn
        : bezelType === "concave"
          ? CONCAVE.fn
          : bezelType === "lip"
            ? LIP.fn
            : CONVEX.fn;
    const map = calculateDisplacementMap(glassThickness, bezelWidth, surfaceFn, refractiveIndex);

    const maximumDisplacement = Math.max(...map.map((v) => Math.abs(v)), 1);

    const displacementData = calculateDisplacementMap2(
      width,
      height,
      width,
      height,
      cornerRadii ?? radius,
      bezelWidth,
      maximumDisplacement,
      map
    );

    const specularData = calculateRefractionSpecular(
      width,
      height,
      cornerRadii ?? radius,
      bezelWidth,
      specularAngle
    );

    const magnifyingData =
      typeof magnifyingScale === "number" && magnifyingScale > 0
        ? calculateMagnifyingDisplacementMap(width, height)
        : null;

    return {
      displacementMapUrl: imageDataToUrl(displacementData),
      specularUrl: imageDataToUrl(specularData),
      magnifyingMapUrl: magnifyingData ? imageDataToUrl(magnifyingData) : null,
      scale: maximumDisplacement * Math.max(scaleRatio, 0.001),
    };
  }, [
    width,
    height,
    radius,
    cornerRadii,
    bezelWidth,
    bezelType,
    glassThickness,
    refractiveIndex,
    scaleRatio,
    magnifyingScale,
    specularAngle,
  ]);

  return (
    <svg aria-hidden style={{ display: "none", position: "absolute" }}>
      <defs>
        <filter
          id={id}
          x="0"
          y="0"
          width={width}
          height={height}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          {magnifyingMapUrl && (
            <>
              <feImage
                href={magnifyingMapUrl}
                x="0"
                y="0"
                width={width}
                height={height}
                result="magnifying_displacement_map"
                preserveAspectRatio="none"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="magnifying_displacement_map"
                scale={magnifyingScale ?? 0}
                xChannelSelector="R"
                yChannelSelector="G"
                result="magnified_source"
              />
            </>
          )}

          {/* Blur (frost) — set blur=0 to skip */}
          <feGaussianBlur
            in={magnifyingMapUrl ? "magnified_source" : "SourceGraphic"}
            stdDeviation={blur}
            result="blurred_source"
          />

          {/* Displacement map image */}
          <feImage
            href={displacementMapUrl}
            x="0"
            y="0"
            width={width}
            height={height}
            result="displacement_map"
            preserveAspectRatio="none"
          />

          {/* Apply refraction displacement (G channel baseline, or full image when no dispersion) */}
          <feDisplacementMap
            in="blurred_source"
            in2="displacement_map"
            scale={scale}
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          />

          {/* ── DISPERSION BLOCK ────────────────────────────────────────────────────
           * Chromatic aberration via per-channel displacement scale split.
           * R uses scale*(1-fraction), B uses scale*(1+fraction).
           * Edge-only by physics: displacement map is 0 at the flat center, so all
           * three channels land on identical pixels there → no fringe. Fringe only
           * appears where the map is non-zero (the bezel).
           * To remove: delete this block and change the two `in` ternaries below
           * (saturation node + withSaturation blend) back to "displaced".
           */}
          {dispersionFraction > 0.001 && (
            <>
              <feDisplacementMap
                in="blurred_source"
                in2="displacement_map"
                scale={scale * (1 - dispersionFraction)}
                xChannelSelector="R"
                yChannelSelector="G"
                result="disp_r"
              />
              <feDisplacementMap
                in="blurred_source"
                in2="displacement_map"
                scale={scale * (1 + dispersionFraction)}
                xChannelSelector="R"
                yChannelSelector="G"
                result="disp_b"
              />
              <feColorMatrix
                in="disp_r"
                type="matrix"
                values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
                result="chan_r"
              />
              <feColorMatrix
                in="displaced"
                type="matrix"
                values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
                result="chan_g"
              />
              <feColorMatrix
                in="disp_b"
                type="matrix"
                values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
                result="chan_b"
              />
              <feBlend in="chan_r" in2="chan_g" mode="screen" result="rg_combined" />
              <feBlend in="rg_combined" in2="chan_b" mode="screen" result="dispersed" />
            </>
          )}
          {/* ── END DISPERSION BLOCK ──────────────────────────────────────────────── */}

          {/* Boost saturation in displaced area (glass-like vibrancy) */}
          <feColorMatrix
            in={dispersionFraction > 0.001 ? "dispersed" : "displaced"}
            type="saturate"
            values={String(specularSaturation)}
            result="displaced_saturated"
          />

          {/* Specular highlight ring */}
          <feImage
            href={specularUrl}
            x="0"
            y="0"
            width={width}
            height={height}
            result="specular_layer"
            preserveAspectRatio="none"
          />

          {/* Clip specular to the glass shape */}
          <feComposite
            in="displaced_saturated"
            in2="specular_layer"
            operator="in"
            result="specular_saturated"
          />

          {/* Fade specular by opacity param */}
          <feComponentTransfer in="specular_layer" result="specular_faded">
            <feFuncA type="linear" slope={specularOpacity} />
          </feComponentTransfer>

          {/* Blend saturated content */}
          <feBlend
            in="specular_saturated"
            in2={dispersionFraction > 0.001 ? "dispersed" : "displaced"}
            mode="normal"
            result="withSaturation"
          />

          {/* Overlay specular highlight */}
          <feBlend in="specular_faded" in2="withSaturation" mode="normal" />
        </filter>
      </defs>
    </svg>
  );
}

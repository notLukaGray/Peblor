"use client";

import { useMemo } from "react";
import type { dividerLayer, ThemeString } from "@pb/contracts/peblor/core/peblor-schemas";
import type { ThemeStringOrGradient } from "@pb/contracts/peblor/core/peblor-schemas/schema-shared-primitives";
import { castBlendMode } from "@pb/core/layout";
import {
  lowerThemeStringToCss,
  lowerThemeStringOrGradientToCss,
} from "@/peblor/theme/theme-string";

type LayerStackProps = {
  layers?: dividerLayer[];
  fill?: ThemeString;
};

/** Renders section background layers (blend modes) or a single fill. */
export function LayerStack({ layers, fill }: LayerStackProps) {
  const layerElements = useMemo(() => {
    if (layers?.length) {
      return layers.map((layer, i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{
            background:
              lowerThemeStringOrGradientToCss(layer.fill as ThemeStringOrGradient) ?? "transparent",
            mixBlendMode: castBlendMode(layer.blendMode),
            opacity: layer.opacity,
          }}
        />
      ));
    }

    const resolvedFill = lowerThemeStringToCss(fill);
    if (resolvedFill) {
      return <div className="absolute inset-0" style={{ background: resolvedFill }} />;
    }

    return null;
  }, [layers, fill]);

  return <>{layerElements}</>;
}

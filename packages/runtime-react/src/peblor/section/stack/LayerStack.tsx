"use client";

import { useMemo } from "react";
import type { dividerLayer, ThemeString } from "@pb/contracts/peblor/core/peblor-schemas";
import { castBlendMode } from "@pb/core/layout";
import { resolveThemeString } from "@/peblor/theme/theme-string";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";

type LayerStackProps = {
  layers?: dividerLayer[];
  fill?: ThemeString;
};

/** Renders section background layers (blend modes) or a single fill. */
export function LayerStack({ layers, fill }: LayerStackProps) {
  const themeMode = usePeblorThemeMode();
  const layerElements = useMemo(() => {
    if (layers?.length) {
      return layers.map((layer, i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{
            background: resolveThemeString(layer.fill, themeMode) ?? "transparent",
            mixBlendMode: castBlendMode(layer.blendMode),
            opacity: layer.opacity,
          }}
        />
      ));
    }

    const resolvedFill = resolveThemeString(fill, themeMode);
    if (resolvedFill) {
      return <div className="absolute inset-0" style={{ background: resolvedFill }} />;
    }

    return null;
  }, [layers, fill, themeMode]);

  return <>{layerElements}</>;
}

import type { CSSProperties } from "react";
import type { ElementLayout } from "@pb/contracts";
import {
  applyPbDefaultTextAlign as applyPbDefaultTextAlignWithGuidelines,
  defaultPbBuilderDefaults,
  defaultPbContentGuidelines,
  type PbBuilderDefaults,
  type PbContentGuidelines,
} from "../defaults/pb-content-guidelines-defaults";

export type PeblorHostConfig = {
  pbBuilderDefaults: PbBuilderDefaults;
  pbContentGuidelines: PbContentGuidelines;
};

let hostConfig: PeblorHostConfig = {
  // Fallback contract: when host sets no overrides, the adapter uses core/defaults values.
  pbBuilderDefaults: defaultPbBuilderDefaults,
  pbContentGuidelines: defaultPbContentGuidelines,
};

export function setPeblorHostConfig(config: Partial<PeblorHostConfig>): void {
  hostConfig = {
    ...hostConfig,
    ...config,
  };
}

export function getPeblorHostConfig(): PeblorHostConfig {
  return hostConfig;
}

export function getPbBuilderDefaults(): PbBuilderDefaults {
  return hostConfig.pbBuilderDefaults;
}

export function getPbContentGuidelines(): PbContentGuidelines {
  return hostConfig.pbContentGuidelines;
}

export function applyPbDefaultTextAlign(
  blockStyle: CSSProperties,
  align: ElementLayout["align"],
  textAlign: ElementLayout["textAlign"]
): void {
  applyPbDefaultTextAlignWithGuidelines(
    blockStyle,
    align,
    textAlign,
    hostConfig.pbContentGuidelines
  );
}

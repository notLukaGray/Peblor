import type { CSSProperties } from "react";
import type { ElementLayout } from "@pb/contracts";
import {
  getPbBuilderDefaultsV1,
  toPbContentGuidelines,
  type PbBuilderDefaults,
} from "../defaults/pb-builder-defaults";
import type { PbContentGuidelines } from "../defaults/pb-guidelines-expand";

export type { PbBuilderDefaults, PbContentGuidelines };

export const defaultPbBuilderDefaults: PbBuilderDefaults = getPbBuilderDefaultsV1();
export const defaultPbContentGuidelines: PbContentGuidelines =
  toPbContentGuidelines(defaultPbBuilderDefaults);

export function applyPbDefaultTextAlign(
  blockStyle: CSSProperties,
  align: ElementLayout["selfAlign"],
  textAlign: ElementLayout["textAlign"],
  guidelines: PbContentGuidelines = defaultPbContentGuidelines
): void {
  const alignFirst = Array.isArray(align) ? align[0] : align;
  const textFirst = Array.isArray(textAlign) ? textAlign[0] : textAlign;
  const multilineAlign = textFirst ?? alignFirst;
  if (multilineAlign) {
    blockStyle.textAlign = multilineAlign as CSSProperties["textAlign"];
  } else {
    blockStyle.textAlign = guidelines.copyTextAlign as CSSProperties["textAlign"];
  }
}

/**
 * Helpers for peblor copy alignment. **Runtime values** live in
 * `pb-content-guidelines-config.ts` (edit via `/dev/style` or by hand).
 */
import type { CSSProperties } from "react";
import type { ElementLayout } from "@pb/contracts";
import { pbContentGuidelines } from "@/app/theme/pb-content-guidelines-config";

export type { PbContentGuidelines } from "@/app/theme/pb-content-guidelines-config";
export {
  pbContentGuidelines,
  pbContentGuidelinesCssInline,
  pbBuilderDefaults,
  pbContentGuidelinesConfigFileExport,
} from "@/app/theme/pb-content-guidelines-config";
export {
  serializePbContentGuidelinesToCss,
  expandGuidelinesToCssVars,
  resolveBlockMarginPair,
  resolveAxisPadding,
} from "@/app/theme/pb-guidelines-expand";

/** Apply default copy alignment when `textAlign` and `align` are both unset. */
export function applyPbDefaultTextAlign(
  blockStyle: CSSProperties,
  selfAlign: ElementLayout["selfAlign"],
  textAlign: ElementLayout["textAlign"]
): void {
  const alignFirst = Array.isArray(selfAlign) ? selfAlign[0] : selfAlign;
  const textFirst = Array.isArray(textAlign) ? textAlign[0] : textAlign;
  const multilineAlign = textFirst ?? alignFirst;
  if (multilineAlign) {
    blockStyle.textAlign = multilineAlign as CSSProperties["textAlign"];
  } else {
    blockStyle.textAlign = pbContentGuidelines.copyTextAlign as CSSProperties["textAlign"];
  }
}

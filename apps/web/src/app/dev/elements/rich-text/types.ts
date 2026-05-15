import type { ElementBlock } from "@pb/contracts";
import type { PbImageAnimationDefaults } from "@/app/theme/pb-builder-defaults";

export type RichTextVariantDefaults = Omit<
  Extract<ElementBlock, { type: "elementRichText" }>,
  "type"
> & {
  animation: PbImageAnimationDefaults;
};

export type RichTextVariantKey = "article" | "compact" | "docs" | "html";

export type PersistedRichTextDefaults = {
  v: 1;
  defaultVariant: RichTextVariantKey;
  variants: Record<RichTextVariantKey, RichTextVariantDefaults>;
};

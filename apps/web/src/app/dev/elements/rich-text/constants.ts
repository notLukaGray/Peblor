import {
  cloneTypographyAnimationFromImageDefaults,
  DEV_NEUTRAL_IMAGE_DEFAULTS,
} from "@/app/dev/elements/element-dev-baseline";
import type { RichTextVariantDefaults, RichTextVariantKey } from "./types";

const NEUTRAL_ANIMATION = cloneTypographyAnimationFromImageDefaults(DEV_NEUTRAL_IMAGE_DEFAULTS);

export const STORAGE_KEY = "pb-element-rich-text-dev-v1";

export const VARIANT_ORDER: RichTextVariantKey[] = ["article", "compact", "docs", "html"];

export const VARIANT_LABELS: Record<RichTextVariantKey, string> = {
  article: "Article",
  compact: "Compact",
  docs: "Docs",
  html: "HTML",
};

export const BASE_DEFAULTS: {
  defaultVariant: RichTextVariantKey;
  variants: Record<RichTextVariantKey, RichTextVariantDefaults>;
} = {
  defaultVariant: "article",
  variants: {
    article: {
      content:
        "## Product story\n\nUse markdown content here with links, lists, and emphasis.\n\n- Clear heading\n- Supporting detail\n- Next step",
      level: 3,
      wordWrap: true,
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
    compact: {
      content:
        "Short update with **bold context** and a [call to action](/work). Keeps rhythm tighter for cards.",
      level: 4,
      wordWrap: true,
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
    docs: {
      content:
        "### API usage\n\n```ts\nconst result = await fetch('/api')\n```\n\n| Field | Type |\n| --- | --- |\n| id | string |",
      level: 5,
      wordWrap: true,
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
    html: {
      content: "Fallback markdown copy",
      markup:
        "<h3>Custom HTML</h3><p>Use sanitized markup when markdown is not enough.</p><p><strong>Tip:</strong> keep semantic tags.</p>",
      level: 4,
      wordWrap: true,
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
  },
};

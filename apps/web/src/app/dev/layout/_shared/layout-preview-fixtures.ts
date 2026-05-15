/* eslint-disable max-lines */
import { DEV_NEUTRAL_BODY_DEFAULTS } from "@/app/dev/elements/element-dev-baseline";
import { buildResolvedTypographyWorkbenchBlock } from "@/app/dev/elements/_shared/typography-workbench-preview";
import { DEFAULT_IMAGE_RUNTIME_DRAFT } from "@/app/dev/elements/image/runtime-draft";
import type { StyleToolPersistedV3 } from "@/app/dev/style/style-tool-persistence";
import type { ElementBlock, SectionBlock } from "@pb/contracts";

type BodyBlock = Extract<ElementBlock, { type: "elementBody" }>;

/** Alternate fills using app theme tokens only (same surface language as `/dev` panels). */
const CARD_FILL_CYCLE = ["var(--card)", "var(--muted)"] as const;

function createBodyElement(id: string, text: string, patch?: Partial<BodyBlock>): ElementBlock {
  const variant = DEV_NEUTRAL_BODY_DEFAULTS.defaultVariant;
  const defaults = DEV_NEUTRAL_BODY_DEFAULTS.variants[variant];
  return buildResolvedTypographyWorkbenchBlock(
    DEFAULT_IMAGE_RUNTIME_DRAFT,
    {
      id,
      type: "elementBody",
      ...defaults,
      text,
      ...(patch ?? {}),
    },
    { mode: "raw" }
  ) as ElementBlock;
}

// eslint-disable-next-line complexity
export function buildLayoutCardElements(
  prefix: string,
  options?: {
    count?: number;
    minHeight?: string;
    /** Fixed box height so scroll/column previews show obvious bounds. */
    height?: string;
    width?: string;
    /** First word before the letter, e.g. `Column` → `Column A`. */
    labelPrefix?: string;
  }
): ElementBlock[] {
  const count = Math.max(1, Math.min(24, Math.round(options?.count ?? 4)));
  const minH = options?.minHeight ?? "7.75rem";
  const height = options?.height ?? minH;
  const labelBase = options?.labelPrefix?.trim() || "Card";
  return Array.from({ length: count }).map((_, index) => {
    const fill = CARD_FILL_CYCLE[index % CARD_FILL_CYCLE.length] ?? CARD_FILL_CYCLE[0];
    const letter = String.fromCharCode(65 + (index % 26));
    const title = `${labelBase} ${letter}`;
    return createBodyElement(`${prefix}-${index + 1}`, title, {
      level: 5,
      color: "var(--foreground)",
      width: options?.width ?? "100%",
      wrapperStyle: {
        background: fill,
        borderRadius: "0.5rem",
        padding: "1rem 1rem",
        minHeight: minH,
        height,
        boxSizing: "border-box",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "center",
        textAlign: "center",
        gap: "0.35rem",
      },
    });
  });
}

type ContentWidthPresets = {
  narrow: string;
  standard: string;
  wide: string;
  full: string;
};

export function buildSectionWidthPreviewSections(
  contentWidths?: ContentWidthPresets
): Extract<SectionBlock, { type: "contentBlock" }>[] {
  const widths = contentWidths ?? {
    narrow: "var(--pb-width-narrow)",
    standard: "var(--pb-width-standard)",
    wide: "var(--pb-width-wide)",
    full: "var(--pb-width-full)",
  };
  const rails = [
    { key: "narrow" as const, heading: "Narrow" },
    { key: "standard" as const, heading: "Standard" },
    { key: "wide" as const, heading: "Wide" },
    { key: "full" as const, heading: "Full" },
  ];

  return rails.map((rail, index) => ({
    type: "contentBlock",
    id: `layout-section-preview-${rail.key}`,
    align: "center",
    gap: "var(--pb-frame-gap)",
    contentWidth: widths[rail.key],
    minHeight: "10rem",
    fill: "transparent",
    border: {
      width: "1px",
      style: "solid",
      color: "var(--border)",
    },
    borderRadius: "0.875rem",
    elements: [
      createBodyElement(`layout-section-preview-${rail.key}-title`, rail.heading, {
        level: 5,
        color: "var(--foreground)",
        width: "100%",
        wrapperStyle: {
          background: "var(--muted)",
          borderRadius: "0.5rem",
          padding: "0.5rem 0.65rem",
          border: "1px solid var(--border)",
          minHeight: "2.75rem",
          display: "flex",
          alignItems: "center",
          fontWeight: 600,
        },
      }),
      createBodyElement(`layout-section-preview-${rail.key}-token`, widths[rail.key], {
        level: 5,
        color: "var(--muted-foreground)",
        width: "100%",
        wrapperStyle: {
          background: "var(--card)",
          borderRadius: "0.5rem",
          padding: "0.5rem 0.65rem",
          border: "1px dashed var(--border)",
          minHeight: "3.25rem",
          display: "flex",
          alignItems: "center",
          fontFamily: "var(--font-mono, ui-monospace, monospace)",
          fontSize: "0.7rem",
        },
      }),
    ],
    ...(index === 0 ? { marginTop: "0px" } : { marginTop: "var(--pb-space-lg)" }),
  })) as Extract<SectionBlock, { type: "contentBlock" }>[];
}

export function buildSectionMarginPreviewSections(): Extract<
  SectionBlock,
  { type: "contentBlock" }
>[] {
  const marginKeys = ["none", "xs", "sm", "md", "lg", "xl"] as const;
  return marginKeys.map((key, index) => ({
    type: "contentBlock",
    id: `layout-section-margin-${key}`,
    align: "center",
    gap: "var(--pb-frame-gap)",
    marginTop: index === 0 ? "0px" : `var(--pb-section-margin-${key})`,
    contentWidth: "var(--pb-width-standard)",
    minHeight: "10.5rem",
    fill: "transparent",
    border: {
      width: "1px",
      style: "solid",
      color: "var(--border)",
    },
    borderRadius: "0.875rem",
    elements: [
      createBodyElement(`layout-section-margin-${key}-label`, `section-margin-${key}`, {
        level: 6,
        color: "var(--foreground)",
        wrapperStyle: {
          background: "var(--muted)",
          borderRadius: "9999px",
          padding: "0.375rem 0.75rem",
          border: "1px solid var(--border)",
          display: "inline-flex",
        },
      }),
      createBodyElement(
        `layout-section-margin-${key}-copy`,
        `This card shifts by --pb-section-margin-${key} from the previous section.`,
        {
          level: 6,
          color: "var(--foreground)",
          wrapperStyle: {
            background: "var(--card)",
            borderRadius: "0.625rem",
            padding: "0.75rem",
            border: "1px dashed var(--border)",
            minHeight: "5.5rem",
            display: "flex",
            alignItems: "center",
          },
        }
      ),
    ],
  })) as Extract<SectionBlock, { type: "contentBlock" }>[];
}

export function buildFramesPreviewSection(options?: {
  count?: number;
  minHeight?: string;
  narrow?: boolean;
}): Extract<SectionBlock, { type: "contentBlock" }> {
  const cardCount = options?.count ?? 6;
  const cardHeight = options?.minHeight ?? "5rem";
  return {
    type: "contentBlock",
    id: "layout-frames-preview",
    align: "center",
    gap: "var(--pb-frame-gap)",
    width: options?.narrow ? "min(70vw, 44rem)" : "100%",
    minHeight: "18rem",
    fill: "transparent",
    border: {
      width: "1px",
      style: "solid",
      color: "var(--border)",
    },
    borderRadius: "0.875rem",
    elements: [
      createBodyElement(
        "layout-frames-preview-guide",
        "Frame bounds guide · children flow inside this region",
        {
          level: 6,
          color: "var(--foreground)",
          wrapperStyle: {
            background: "var(--muted)",
            borderRadius: "0.625rem",
            padding: "0.625rem 0.75rem",
            border: "1px solid var(--border)",
            minHeight: "3.5rem",
          },
        }
      ),
      ...buildLayoutCardElements("layout-frames-preview", {
        count: cardCount,
        minHeight: cardHeight,
      }),
    ],
  };
}

type LayerPreviewSlices = Pick<StyleToolPersistedV3, "zIndexLayers" | "opacityScale">;

const LAYER_OPACITY_KEY: Record<
  "base" | "raised" | "overlay" | "modal",
  keyof LayerPreviewSlices["opacityScale"]
> = {
  base: "muted",
  raised: "dimmed",
  overlay: "strong",
  modal: "full",
};

const SHARED_PAGE_CARD_BODY_STYLE = {
  borderRadius: "0.625rem",
  border: "1px solid var(--border)",
  padding: "0.625rem 0.75rem",
  minHeight: "5.25rem",
  display: "flex",
  alignItems: "center",
  fontSize: "0.8125rem",
  lineHeight: 1.35,
} as const;

export function buildPageLayerPreviewSections(
  slices: LayerPreviewSlices
): Extract<SectionBlock, { type: "contentBlock" }>[] {
  const layers = [
    {
      key: "base" as const,
      label: "Base",
      initialX: "8%",
      initialY: "8%",
      fill: "var(--secondary)",
      color: "var(--secondary-foreground)",
      laneFill: "var(--muted)",
      depthShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    },
    {
      key: "raised" as const,
      label: "Raised",
      initialX: "14%",
      initialY: "30%",
      fill: "var(--accent)",
      color: "var(--accent-foreground)",
      laneFill: "var(--muted)",
      depthShadow: "0 1px 2px 0 rgb(0 0 0 / 0.06)",
    },
    {
      key: "overlay" as const,
      label: "Overlay",
      initialX: "20%",
      initialY: "52%",
      fill: "var(--primary)",
      color: "var(--primary-foreground)",
      laneFill: "var(--muted)",
      depthShadow: "0 1px 3px 0 rgb(0 0 0 / 0.08)",
    },
    {
      key: "modal" as const,
      label: "Modal",
      initialX: "26%",
      initialY: "74%",
      fill: "var(--muted)",
      color: "var(--foreground)",
      laneFill: "var(--card)",
      depthShadow: "0 1px 3px 0 rgb(0 0 0 / 0.08)",
    },
  ];

  return layers.map((layer) => {
    const opacityKey = LAYER_OPACITY_KEY[layer.key];
    const layerOpacity = slices.opacityScale[opacityKey];
    return {
      type: "contentBlock",
      id: `layout-page-layer-${layer.key}`,
      gap: "var(--pb-frame-gap)",
      width: "19rem",
      minHeight: "11.5rem",
      contentWidth: "full",
      align: "left",
      initialX: layer.initialX,
      initialY: layer.initialY,
      zIndex: slices.zIndexLayers[layer.key],
      opacity: layerOpacity,
      fill: layer.fill,
      borderRadius: "0.75rem",
      border: {
        width: "1px",
        style: "solid",
        color: "var(--border)",
      },
      boxShadow: layer.depthShadow,
      elements: [
        createBodyElement(`layout-page-layer-${layer.key}-label`, `${layer.label} layer`, {
          level: 5,
          color: layer.color,
          wrapperStyle: {
            ...SHARED_PAGE_CARD_BODY_STYLE,
            background: layer.laneFill,
          },
        }),
        createBodyElement(
          `layout-page-layer-${layer.key}-meta`,
          `z-index ${slices.zIndexLayers[layer.key]} · opacity ${opacityKey} (${layerOpacity.toFixed(2)})`,
          {
            level: 5,
            color: layer.color,
            wrapperStyle: {
              ...SHARED_PAGE_CARD_BODY_STYLE,
              background: "var(--card)",
            },
          }
        ),
      ],
    };
  });
}

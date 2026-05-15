import { describe, expect, it } from "vitest";
import { applyBuilderElementDefaultsToSections } from "./peblor-apply-element-defaults";
import { getPeblorHostConfig, setPeblorHostConfig } from "./adapters/host-config";
import type { SectionBlock } from "@pb/contracts/types";

function imageSection(...elements: Record<string, unknown>[]): SectionBlock {
  return {
    type: "contentBlock",
    id: "s-1",
    elements,
  } as unknown as SectionBlock;
}

describe("peblor-apply-element-defaults", () => {
  it("applies image variant defaults including motion timing", () => {
    const sections = applyBuilderElementDefaultsToSections([
      imageSection({
        type: "elementImage",
        id: "img-1",
        variant: "hero",
        src: "/hero.webp",
        alt: "Hero",
      }),
    ]);

    const image = (sections[0] as unknown as { elements: Array<Record<string, unknown>> })
      .elements[0]!;
    expect(image.objectFit).toBe("cover");
    expect(image.aspectRatio).toBe("16 / 9");
    expect(image.borderRadius).toBe("0.375rem");
    expect(image.align).toBe("center");
    expect(image.alignY).toBe("center");
    expect(image.overflow).toBe("hidden");
    expect(image.priority).toBe(true);
    expect(image.opacity).toBe(1);
    expect(image.motionTiming).toMatchObject({
      trigger: "onFirstVisible",
      entrancePreset: "slideUp",
      exitPreset: "fade",
    });
  });

  it("respects explicit image settings and explicit motion timing", () => {
    const sections = applyBuilderElementDefaultsToSections([
      imageSection({
        type: "elementImage",
        id: "img-2",
        variant: "feature",
        src: "/feature.webp",
        alt: "Feature",
        objectFit: "contain",
        borderRadius: "2rem",
        align: "right",
        overflow: "auto",
        priority: false,
        motionTiming: {
          trigger: "onMount",
          entrancePreset: "fade",
          exitPreset: "slideDown",
        },
      }),
    ]);

    const image = (sections[0] as unknown as { elements: Array<Record<string, unknown>> })
      .elements[0]!;
    expect(image.objectFit).toBe("contain");
    expect(image.borderRadius).toBe("2rem");
    expect(image.align).toBe("right");
    expect(image.overflow).toBe("auto");
    expect(image.priority).toBe(false);
    expect(image.motionTiming).toMatchObject({
      trigger: "onMount",
      entrancePreset: "fade",
      exitPreset: "slideDown",
    });
  });

  it("does not inject motion timing when custom motion object already exists", () => {
    const sections = applyBuilderElementDefaultsToSections([
      imageSection({
        type: "elementImage",
        id: "img-3",
        variant: "inline",
        src: "/inline.webp",
        alt: "Inline",
        motion: {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
        },
      }),
    ]);

    const image = (sections[0] as unknown as { elements: Array<Record<string, unknown>> })
      .elements[0]!;
    expect(image.motion).toMatchObject({
      initial: { opacity: 0 },
      animate: { opacity: 1 },
    });
    expect(image.motionTiming).toBeUndefined();
  });

  it("applies heading variant template defaults when fields are omitted", () => {
    const sections = applyBuilderElementDefaultsToSections([
      imageSection({
        type: "elementHeading",
        id: "h-1",
        variant: "section",
        level: 2,
        text: "Title",
      }),
    ]);

    const heading = (sections[0] as unknown as { elements: Array<Record<string, unknown>> })
      .elements[0]!;
    expect(heading.wordWrap).toBe(true);
    expect(heading.align).toBe("left");
    expect(heading.alignY).toBe("top");
  });

  it("applies fill layout defaults for full-cover variant", () => {
    const sections = applyBuilderElementDefaultsToSections([
      imageSection({
        type: "elementImage",
        id: "img-4",
        variant: "fullCover",
        src: "/cover.webp",
        alt: "Cover",
      }),
    ]);

    const image = (sections[0] as unknown as { elements: Array<Record<string, unknown>> })
      .elements[0]!;
    expect(image.width).toBe("100%");
    expect(image.height).toBe("100%");
    expect(image.aspectRatio).toBeUndefined();
  });

  it("resolves image variant aliases (full cover/full-cover/fullcover)", () => {
    const fromWords = applyBuilderElementDefaultsToSections([
      imageSection({
        type: "elementImage",
        id: "img-words",
        variant: "full cover",
        src: "/cover-words.webp",
        alt: "Cover words",
      }),
    ]);
    const fromHyphen = applyBuilderElementDefaultsToSections([
      imageSection({
        type: "elementImage",
        id: "img-hyphen",
        variant: "full-cover",
        src: "/cover-hyphen.webp",
        alt: "Cover hyphen",
      }),
    ]);
    const fromFlat = applyBuilderElementDefaultsToSections([
      imageSection({
        type: "elementImage",
        id: "img-flat",
        variant: "fullcover",
        src: "/cover-flat.webp",
        alt: "Cover flat",
      }),
    ]);

    for (const section of [fromWords, fromHyphen, fromFlat]) {
      const image = (section[0] as unknown as { elements: Array<Record<string, unknown>> })
        .elements[0]!;
      expect(image.width).toBe("100%");
      expect(image.height).toBe("100%");
      expect(image.objectFit).toBe("cover");
      expect(image.aspectRatio).toBeUndefined();
    }
  });

  it("resolves heading/body/link aliases to canonical variants", () => {
    const sections = applyBuilderElementDefaultsToSections([
      imageSection({
        type: "elementHeading",
        id: "h-alias",
        variant: "headline",
        level: 1,
        text: "Headline",
      }),
      imageSection({
        type: "elementBody",
        id: "b-alias",
        variant: "body text",
        text: "Body",
      }),
      imageSection({
        type: "elementLink",
        id: "l-alias",
        variant: "navigation",
        label: "Nav",
        href: "/",
        copyType: "body",
      }),
    ]);

    const heading = (sections[0] as unknown as { elements: Array<Record<string, unknown>> })
      .elements[0]!;
    const body = (sections[1] as unknown as { elements: Array<Record<string, unknown>> })
      .elements[0]!;
    const link = (sections[2] as unknown as { elements: Array<Record<string, unknown>> })
      .elements[0]!;

    expect(heading.alignY).toBe("center");
    expect(body.wordWrap).toBe(true);
    expect(link.align).toBe("center");
  });

  it("applies button accent variant — injects wrapperFill and copyType", () => {
    const sections = applyBuilderElementDefaultsToSections([
      imageSection({
        type: "elementButton",
        id: "btn-accent",
        variant: "accent",
        label: "Buy now",
      }),
    ]);
    const btn = (sections[0] as unknown as { elements: Array<Record<string, unknown>> })
      .elements[0]!;
    expect(btn.copyType).toBe("body");
    expect(btn.level).toBe(3);
    expect(btn.wrapperFill).toBe("var(--pb-accent)");
    expect(btn.wrapperBorderRadius).toBeTruthy();
    expect(btn.wrapperStroke).toBeUndefined();
  });

  it("applies button ghost variant — injects wrapperStroke, no fill", () => {
    const sections = applyBuilderElementDefaultsToSections([
      imageSection({ type: "elementButton", id: "btn-ghost", variant: "ghost", label: "Learn" }),
    ]);
    const btn = (sections[0] as unknown as { elements: Array<Record<string, unknown>> })
      .elements[0]!;
    expect(btn.wrapperStroke).toBe("var(--pb-border)");
    expect(btn.wrapperFill).toBeUndefined();
  });

  it("applies button text variant — no wrapper styling injected", () => {
    const sections = applyBuilderElementDefaultsToSections([
      imageSection({ type: "elementButton", id: "btn-text", variant: "text", label: "Read more" }),
    ]);
    const btn = (sections[0] as unknown as { elements: Array<Record<string, unknown>> })
      .elements[0]!;
    expect(btn.copyType).toBe("body");
    expect(btn.level).toBe(5);
    expect(btn.wrapperFill).toBeUndefined();
    expect(btn.wrapperStroke).toBeUndefined();
    expect(btn.wrapperPadding).toBeUndefined();
  });

  it("resolves button alias 'primary' to accent", () => {
    const sections = applyBuilderElementDefaultsToSections([
      imageSection({ type: "elementButton", id: "btn-primary", variant: "primary", label: "Go" }),
    ]);
    const btn = (sections[0] as unknown as { elements: Array<Record<string, unknown>> })
      .elements[0]!;
    expect(btn.wrapperFill).toBe("var(--pb-accent)");
  });

  it("respects explicit button fields — does not overwrite set values", () => {
    const sections = applyBuilderElementDefaultsToSections([
      imageSection({
        type: "elementButton",
        id: "btn-explicit",
        variant: "accent",
        label: "Custom",
        copyType: "heading",
        level: 1,
        wrapperFill: "#ff0000",
      }),
    ]);
    const btn = (sections[0] as unknown as { elements: Array<Record<string, unknown>> })
      .elements[0]!;
    expect(btn.copyType).toBe("heading");
    expect(btn.level).toBe(1);
    expect(btn.wrapperFill).toBe("#ff0000");
  });

  it("applies crop variant defaults including imageCrop", () => {
    const sections = applyBuilderElementDefaultsToSections([
      imageSection({
        type: "elementImage",
        id: "img-crop",
        variant: "crop",
        src: "/crop.webp",
        alt: "Crop",
      }),
    ]);

    const image = (sections[0] as unknown as { elements: Array<Record<string, unknown>> })
      .elements[0]!;
    expect(image.objectFit).toBe("crop");
    expect(image.aspectRatio).toBe("16 / 9");
    expect(image.imageCrop).toMatchObject({ x: 0, y: 0, scale: 1 });
  });

  it("applies workbench element defaults for extended element types", () => {
    const originalConfig = getPeblorHostConfig();
    setPeblorHostConfig({
      pbBuilderDefaults: {
        ...originalConfig.pbBuilderDefaults,
        workbenchElements: {
          richText: {
            defaultVariant: "article",
            variants: { article: { level: 3, wordWrap: true } },
          },
          videoTime: {
            defaultVariant: "default",
            variants: { default: { format: "mm:ss", style: { color: "#fff" } } },
          },
          vector: {
            defaultVariant: "default",
            variants: { default: { viewBox: "0 0 24 24", shapes: [] } },
          },
          svg: {
            defaultVariant: "default",
            variants: { default: { markup: '<svg viewBox="0 0 1 1" />' } },
          },
          model3d: {
            defaultVariant: "default",
            variants: {
              default: { aspectRatio: "16/9", scene: { camera: { type: "perspective" } } },
            },
          },
          rive: {
            defaultVariant: "default",
            variants: { default: { src: "/demo.riv", fit: "contain", autoplay: false } },
          },
          scrollProgressBar: {
            defaultVariant: "default",
            variants: {
              default: {
                height: "4px",
                fill: "#fff",
                trackBackground: "rgba(255,255,255,0.2)",
                offset: ["start end", "end start"],
              },
            },
          },
        },
      },
    });

    try {
      const sections = applyBuilderElementDefaultsToSections([
        imageSection(
          { type: "elementRichText", content: "Copy" },
          { type: "elementVideoTime" },
          { type: "elementVector" },
          { type: "elementSVG" },
          { type: "elementModel3D" },
          { type: "elementRive" },
          { type: "elementScrollProgressBar" }
        ),
      ]);

      const elements = (sections[0] as unknown as { elements: Array<Record<string, unknown>> })
        .elements;
      expect(elements[0]?.level).toBe(3);
      expect(elements[1]?.format).toBe("mm:ss");
      expect(elements[2]?.viewBox).toBe("0 0 24 24");
      expect(elements[3]?.markup).toBe('<svg viewBox="0 0 1 1" />');
      expect(elements[4]?.aspectRatio).toBe("16/9");
      expect(elements[5]?.src).toBe("/demo.riv");
      expect(elements[6]?.height).toBe("4px");
    } finally {
      setPeblorHostConfig(originalConfig);
    }
  });
});

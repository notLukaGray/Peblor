import { describe, expect, it } from "vitest";
import {
  DEFAULT_PB_BUILDER_FOUNDATIONS,
  buildImageMotionTimingFromAnimationDefaults,
  createPbBuilderDefaultsFromFoundations,
  buildLayeredHybridEntranceMotion,
  buildSequentialHybridEntranceMotion,
  mergeHybridExitStackKeyframes,
  pbBuilderDefaultsV1,
  toPbContentGuidelines,
  withUnifiedRadius,
} from "@/app/theme/pb-builder-defaults";

describe("pb-builder-defaults", () => {
  it("adapts grouped defaults to legacy content guidelines", () => {
    const flat = toPbContentGuidelines(pbBuilderDefaultsV1);
    expect(flat.copyTextAlign).toBe("center");
    expect(flat.frameGapWhenUnset).toBe("1rem");
    expect(flat.frameBorderRadiusDefault).toBe("0.375rem");
    expect(flat.richTextParagraphGap).toBe("0.5rem");
    expect(flat.buttonNakedPadding).toBe("0.5rem 1.25rem");
  });

  it("applies unified radius across module frame, button, and image defaults", () => {
    const updated = withUnifiedRadius(pbBuilderDefaultsV1, "2rem");
    expect(updated.modules.frame.borderRadiusDefault).toBe("2rem");
    expect(updated.elements.button.nakedBorderRadius).toBe("2rem");
    expect(updated.elements.image.borderRadius).toBe("2rem");
    expect(updated.elements.image.variants.hero.borderRadius).toBe("2rem");
    expect(updated.elements.image.variants.inline.borderRadius).toBe("2rem");
    expect(updated.elements.image.variants.feature.borderRadius).toBe("2rem");
    expect(updated.elements.image.variants.crop.borderRadius).toBe("2rem");
    expect(updated.elements.image.variants.fullCover.borderRadius).toBe("0");
  });

  it("builds v1 defaults from a single foundations source", () => {
    const built = createPbBuilderDefaultsFromFoundations(DEFAULT_PB_BUILDER_FOUNDATIONS);
    expect(built).toEqual(pbBuilderDefaultsV1);
  });

  it("includes typography element variant defaults", () => {
    expect(pbBuilderDefaultsV1.elements.heading.defaultVariant).toBe("display");
    expect(pbBuilderDefaultsV1.elements.heading.variants.display.variant).toBe("display");
    expect(pbBuilderDefaultsV1.elements.body.defaultVariant).toBe("standard");
    expect(pbBuilderDefaultsV1.elements.body.variants.lead.variant).toBe("lead");
    expect(pbBuilderDefaultsV1.elements.link.defaultVariant).toBe("inline");
    expect(pbBuilderDefaultsV1.elements.link.variants.emphasis.copyType).toBe("heading");
  });

  it("builds sequential hybrid entrance as per-property keyframe arrays", () => {
    const seq = buildSequentialHybridEntranceMotion("slideUp", ["zoomIn", "tiltIn"], 0.6);
    expect(Array.isArray(seq.animate.y)).toBe(true);
    const yKeys = seq.animate.y as unknown[];
    expect(yKeys.length).toBeGreaterThanOrEqual(3);
    const times = (seq.transition as { times?: number[] }).times;
    expect(times?.length).toBe(yKeys.length);
    const outKf = mergeHybridExitStackKeyframes(["zoomOut", "tiltIn"]);
    expect(Object.keys(outKf.exit).length).toBeGreaterThan(0);
  });

  it("honors custom ordered hybrid segment weights in transition.times", () => {
    const seq = buildSequentialHybridEntranceMotion("fade", ["zoomIn"], 1, [0.2, 0.8]);
    const times = (seq.transition as { times?: number[] }).times;
    expect(times).toEqual([0, 0.2, 1]);
  });

  it("builds layered hybrid as merged keyframes with optional per-property stagger", () => {
    const flat = buildLayeredHybridEntranceMotion("fade", ["zoomIn"], 0.5);
    expect(flat.animate).toMatchObject({ opacity: 1 });
    expect((flat.transition as { duration?: number }).duration).toBe(0.5);
    const staggered = buildLayeredHybridEntranceMotion("fade", ["zoomIn"], 0.5, {
      staggerEnabled: true,
      staggerSec: 0.05,
    });
    expect(typeof (staggered.transition as Record<string, unknown>).opacity).toBe("object");
  });

  it("applies preset duration overrides when fineTune is disabled", () => {
    const anim = {
      ...pbBuilderDefaultsV1.elements.image.variants.hero.animation,
      presetEntranceDuration: 0.8,
      presetExitDuration: 0.3,
    };
    const mt = buildImageMotionTimingFromAnimationDefaults(anim);
    expect(mt.exitTrigger).toBe("manual");
    expect(mt.entranceMotion?.transition).toMatchObject({
      duration: 0.8,
    });
    expect(mt.exitMotion?.transition).toMatchObject({
      duration: 0.3,
    });
  });

  it("includes animation defaults for image variants", () => {
    expect(pbBuilderDefaultsV1.elements.image.variants.hero.animation).toMatchObject({
      trigger: "onFirstVisible",
      exitTrigger: "manual",
      entrancePreset: "slideUp",
      exitPreset: "fade",
    });
    expect(pbBuilderDefaultsV1.elements.image.variants.fullCover.animation).toMatchObject({
      trigger: "onMount",
      entrancePreset: "fade",
      exitPreset: "fade",
    });
  });

  it("supports mode-based image layout defaults", () => {
    expect(pbBuilderDefaultsV1.elements.image.variants.hero.layoutMode).toBe("aspectRatio");
    expect(pbBuilderDefaultsV1.elements.image.variants.hero.aspectRatio).toBe("16 / 9");
    expect(pbBuilderDefaultsV1.elements.image.variants.fullCover.layoutMode).toBe("fill");
    expect(pbBuilderDefaultsV1.elements.image.variants.fullCover.width).toBe("100%");
    expect(pbBuilderDefaultsV1.elements.image.variants.fullCover.height).toBe("100%");
    expect(pbBuilderDefaultsV1.elements.image.variants.crop.layoutMode).toBe("aspectRatio");
    expect(pbBuilderDefaultsV1.elements.image.variants.crop.objectFit).toBe("crop");
    expect(pbBuilderDefaultsV1.elements.image.variants.crop.imageCrop).toMatchObject({
      x: 0,
      y: 0,
      scale: 1,
    });
  });

  it("maps start alignment to text/flex defaults from foundations", () => {
    const built = createPbBuilderDefaultsFromFoundations({
      alignment: "start",
      spacingBaseRem: 0.5,
      radiusBaseRem: 0.375,
    });
    expect(built.sections.defaultTextAlign).toBe("start");
    expect(built.modules.frame.alignItemsDefault).toBe("flex-start");
    expect(built.modules.frame.justifyContentDefault).toBe("flex-start");
  });
});

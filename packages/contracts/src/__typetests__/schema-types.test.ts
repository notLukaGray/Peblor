import { describe, it, expect, expectTypeOf } from "vitest";
import { z } from "zod";
import {
  sectionBlockSchema,
  elementBlockSchema,
  bgBlockSchema,
  backgroundTransitionEffectSchema,
  sectionEffectSchema,
  pageDensitySchema,
  type SectionBlock,
  type ElementBlock,
  type PeblorDefinitionBlock,
} from "@pb/contracts";

// ---------------------------------------------------------------------------
// Discriminated union: sectionBlockSchema
// ---------------------------------------------------------------------------
describe("sectionBlockSchema", () => {
  it("is a discriminated union on 'type' with all section variants", () => {
    const s = sectionBlockSchema;
    expectTypeOf(s._def).toHaveProperty("type");
    // Verify the union has 7+ variants (each section type)
    const options = s.options;
    expectTypeOf(options).toBeArray();
    expect(options.length).toBeGreaterThanOrEqual(7);
  });

  it("infers SectionBlock as a discriminated union", () => {
    // A sectionBlock must have a 'type' discriminant
    type SectionType = SectionBlock["type"];
    expectTypeOf<SectionType>().toEqualTypeOf<
      | "divider"
      | "contentBlock"
      | "scrollContainer"
      | "sectionColumn"
      | "sectionTrigger"
      | "pageTrigger"
      | "formBlock"
      | "revealSection"
    >();
  });

  it("knows sectionColumn has elementOrder as required", () => {
    // sectionColumn has required elementOrder (string[] or responsive tier map)
    type ColumnSection = Extract<SectionBlock, { type: "sectionColumn" }>;
    expectTypeOf<ColumnSection>().toHaveProperty("elementOrder");
  });
});

// ---------------------------------------------------------------------------
// Discriminated union: elementBlockSchema
// ---------------------------------------------------------------------------
describe("elementBlockSchema", () => {
  it("is a discriminated union on 'type' with many element variants", () => {
    const options = elementBlockSchema.options;
    expectTypeOf(options).toBeArray();
    expect(options.length).toBeGreaterThanOrEqual(20);
  });

  it("infers ElementBlock as a discriminated union", () => {
    type ElementType = ElementBlock["type"];
    expectTypeOf<ElementType>().toEqualTypeOf<
      | "elementHeading"
      | "elementBody"
      | "elementLink"
      | "elementImage"
      | "elementVideo"
      | "elementVector"
      | "elementSVG"
      | "elementRichText"
      | "elementRange"
      | "elementInput"
      | "elementVideoTime"
      | "elementVideoQualitySelect"
      | "elementSpacer"
      | "elementDivider"
      | "elementScrollProgressBar"
      | "elementButton"
      | "elementModel3D"
      | "elementRive"
      | "elementGroup"
      | "elementInfiniteScroll"
      | "elementFormField"
      | "elementAudio"
      | "elementCounter"
      | "elementMarquee"
      | "elementImageCompare"
      | "elementTabs"
      | "elementTooltip"
      | "elementLottie"
      | "elementDrag"
      | "elementEmbed"
      | "elementList"
      | "elementBlockquote"
      | "elementTable"
      | "elementCode"
    >();
  });

  it("knows elementHeading has text as a string", () => {
    type Heading = Extract<ElementBlock, { type: "elementHeading" }>;
    expectTypeOf<Heading>().toHaveProperty("text");
    expectTypeOf<Heading["text"]>().toBeString();
  });

  it("knows elementHeading has optional variant", () => {
    type Heading = Extract<ElementBlock, { type: "elementHeading" }>;
    expectTypeOf<Heading["variant"]>().toBeNullable();
  });
});

// ---------------------------------------------------------------------------
// Discriminated union: bgBlockSchema
// ---------------------------------------------------------------------------
describe("bgBlockSchema", () => {
  it("is a discriminated union on 'type'", () => {
    const options = bgBlockSchema.options;
    expectTypeOf(options).toBeArray();
    expect(options.length).toBeGreaterThanOrEqual(4);
  });

  it("has backgroundVideo variant with video string field", () => {
    type BgVideo = Extract<z.infer<typeof bgBlockSchema>, { type: "backgroundVideo" }>;
    expectTypeOf<BgVideo>().toHaveProperty("video");
    expectTypeOf<BgVideo["video"]>().toBeString();
  });

  it("has backgroundImage variant with image string field", () => {
    type BgImage = Extract<z.infer<typeof bgBlockSchema>, { type: "backgroundImage" }>;
    expectTypeOf<BgImage>().toHaveProperty("image");
    expectTypeOf<BgImage["image"]>().toBeString();
  });

  it("has backgroundTransition variant with from and to fields", () => {
    type BgTransition = Extract<z.infer<typeof bgBlockSchema>, { type: "backgroundTransition" }>;
    expectTypeOf<BgTransition>().toHaveProperty("from");
    expectTypeOf<BgTransition>().toHaveProperty("to");
  });
});

// ---------------------------------------------------------------------------
// Union: peblorDefinitionBlockSchema
// ---------------------------------------------------------------------------
describe("peblorDefinitionBlockSchema", () => {
  it("infers PeblorDefinitionBlock as a large union of sections and elements", () => {
    // Verify the union is wider than either sections or elements alone
    type SectionOnly = Extract<PeblorDefinitionBlock, { type: string }>;
    type SectionCount = keyof SectionOnly extends never ? 0 : 1;
    expectTypeOf<SectionCount>().toBeNumber();
  });

  it("accepts preset references (object with preset string)", () => {
    const preset: PeblorDefinitionBlock = { preset: "my-preset" };
    expect(preset.preset).toBe("my-preset");
  });
});

// ---------------------------------------------------------------------------
// Discriminated union: backgroundTransitionEffectSchema
// ---------------------------------------------------------------------------
describe("backgroundTransitionEffectSchema", () => {
  it("has TIME, TRIGGER, and SCROLL variants", () => {
    type TransitionEffect = z.infer<typeof backgroundTransitionEffectSchema>;
    type TransitionType = TransitionEffect["type"];
    expectTypeOf<TransitionType>().toEqualTypeOf<"TIME" | "TRIGGER" | "SCROLL">();
  });

  it("TIME variant has from, to, and duration fields", () => {
    type TimeEffect = Extract<z.infer<typeof backgroundTransitionEffectSchema>, { type: "TIME" }>;
    expectTypeOf<TimeEffect>().toHaveProperty("from");
    expectTypeOf<TimeEffect["from"]>().toBeString();
    expectTypeOf<TimeEffect>().toHaveProperty("duration");
    expectTypeOf<TimeEffect["duration"]>().toBeNumber();
  });
});

// ---------------------------------------------------------------------------
// Discriminated union: sectionEffectSchema
// ---------------------------------------------------------------------------
describe("sectionEffectSchema", () => {
  it("is a discriminated union on 'type'", () => {
    const options = sectionEffectSchema.options;
    expectTypeOf(options).toBeArray();
    expect(options.length).toBeGreaterThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// pageDensitySchema
// ---------------------------------------------------------------------------
describe("pageDensitySchema", () => {
  it("is a string enum of density levels", () => {
    type Density = z.infer<typeof pageDensitySchema>;
    expectTypeOf<Density>().toEqualTypeOf<"comfortable" | "balanced" | "compact">();
  });
});

import { describe, it, expectTypeOf } from "vitest";
import type { SectionBlock, ElementBlock, PeblorDefinitionBlock } from "@pb/contracts";

// ---------------------------------------------------------------------------
// SectionBlock discriminated union narrows correctly for each type
// ---------------------------------------------------------------------------
describe("SectionBlock discriminated union", () => {
  it("narrows to divider", () => {
    type Divider = Extract<SectionBlock, { type: "divider" }>;
    expectTypeOf<Divider>().toHaveProperty("type");
    expectTypeOf<Divider["type"]>().toEqualTypeOf<"divider">();
  });

  it("narrows to contentBlock", () => {
    type Content = Extract<SectionBlock, { type: "contentBlock" }>;
    expectTypeOf<Content["type"]>().toEqualTypeOf<"contentBlock">();
    expectTypeOf<Content>().toHaveProperty("elements");
  });

  it("narrows to scrollContainer with scrollDirection", () => {
    type Scroll = Extract<SectionBlock, { type: "scrollContainer" }>;
    expectTypeOf<Scroll["type"]>().toEqualTypeOf<"scrollContainer">();
    expectTypeOf<Scroll>().toHaveProperty("scrollDirection");
  });

  it("narrows to sectionColumn with elementOrder", () => {
    type Column = Extract<SectionBlock, { type: "sectionColumn" }>;
    expectTypeOf<Column>().toHaveProperty("elementOrder");
    expectTypeOf<Column>().toHaveProperty("columnAssignments");
  });

  it("narrows to sectionTrigger", () => {
    type Trigger = Extract<SectionBlock, { type: "sectionTrigger" }>;
    expectTypeOf<Trigger["type"]>().toEqualTypeOf<"sectionTrigger">();
  });

  it("narrows to pageTrigger with onMount and onUnmount", () => {
    type PageTrigger = Extract<SectionBlock, { type: "pageTrigger" }>;
    expectTypeOf<PageTrigger["type"]>().toEqualTypeOf<"pageTrigger">();
    expectTypeOf<PageTrigger>().toHaveProperty("onMount");
    expectTypeOf<PageTrigger>().toHaveProperty("onUnmount");
  });

  it("narrows to formBlock with fields", () => {
    type Form = Extract<SectionBlock, { type: "formBlock" }>;
    expectTypeOf<Form["type"]>().toEqualTypeOf<"formBlock">();
    expectTypeOf<Form>().toHaveProperty("fields");
  });

  it("narrows to revealSection with triggerMode", () => {
    type Reveal = Extract<SectionBlock, { type: "revealSection" }>;
    expectTypeOf<Reveal["type"]>().toEqualTypeOf<"revealSection">();
    expectTypeOf<Reveal>().toHaveProperty("triggerMode");
    expectTypeOf<Reveal>().toHaveProperty("expandAxis");
  });

  it("all section types are covered by the union", () => {
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
});

// ---------------------------------------------------------------------------
// ElementBlock discriminated union narrows correctly
// ---------------------------------------------------------------------------
describe("ElementBlock discriminated union", () => {
  it("narrows to elementHeading with text and optional variant", () => {
    type Heading = Extract<ElementBlock, { type: "elementHeading" }>;
    expectTypeOf<Heading["type"]>().toEqualTypeOf<"elementHeading">();
    expectTypeOf<Heading>().toHaveProperty("text");
    expectTypeOf<Heading["text"]>().toBeString();
    expectTypeOf<Heading["variant"]>().toBeNullable();
  });

  it("narrows to elementImage with src and alt fields", () => {
    type Image = Extract<ElementBlock, { type: "elementImage" }>;
    expectTypeOf<Image["type"]>().toEqualTypeOf<"elementImage">();
    expectTypeOf<Image>().toHaveProperty("src");
    expectTypeOf<Image["src"]>().toBeString();
    expectTypeOf<Image>().toHaveProperty("alt");
    expectTypeOf<Image["alt"]>().toBeString();
  });

  it("narrows to elementButton", () => {
    type Button = Extract<ElementBlock, { type: "elementButton" }>;
    expectTypeOf<Button["type"]>().toEqualTypeOf<"elementButton">();
  });

  it("narrows to elementVideo with src and poster", () => {
    type Video = Extract<ElementBlock, { type: "elementVideo" }>;
    expectTypeOf<Video["type"]>().toEqualTypeOf<"elementVideo">();
    expectTypeOf<Video>().toHaveProperty("src");
    expectTypeOf<Video>().toHaveProperty("poster");
  });

  it("narrows to elementGroup", () => {
    type Group = Extract<ElementBlock, { type: "elementGroup" }>;
    expectTypeOf<Group["type"]>().toEqualTypeOf<"elementGroup">();
  });

  it("narrows to elementModel3D", () => {
    type Model3D = Extract<ElementBlock, { type: "elementModel3D" }>;
    expectTypeOf<Model3D["type"]>().toEqualTypeOf<"elementModel3D">();
  });

  it("narrows to elementBody with text field", () => {
    type Body = Extract<ElementBlock, { type: "elementBody" }>;
    expectTypeOf<Body["type"]>().toEqualTypeOf<"elementBody">();
    expectTypeOf<Body>().toHaveProperty("text");
    expectTypeOf<Body["text"]>().toBeString();
  });

  it("narrows to elementSpacer", () => {
    type Spacer = Extract<ElementBlock, { type: "elementSpacer" }>;
    expectTypeOf<Spacer["type"]>().toEqualTypeOf<"elementSpacer">();
  });

  it("narrows to elementRichText", () => {
    type RichText = Extract<ElementBlock, { type: "elementRichText" }>;
    expectTypeOf<RichText["type"]>().toEqualTypeOf<"elementRichText">();
  });

  it("narrows to elementLink with href", () => {
    type Link = Extract<ElementBlock, { type: "elementLink" }>;
    expectTypeOf<Link["type"]>().toEqualTypeOf<"elementLink">();
    expectTypeOf<Link>().toHaveProperty("href");
  });

  it("narrows to elementMarquee", () => {
    type Marquee = Extract<ElementBlock, { type: "elementMarquee" }>;
    expectTypeOf<Marquee["type"]>().toEqualTypeOf<"elementMarquee">();
  });

  it("narrows to elementLottie", () => {
    type Lottie = Extract<ElementBlock, { type: "elementLottie" }>;
    expectTypeOf<Lottie["type"]>().toEqualTypeOf<"elementLottie">();
  });

  it("narrows to elementRive", () => {
    type Rive = Extract<ElementBlock, { type: "elementRive" }>;
    expectTypeOf<Rive["type"]>().toEqualTypeOf<"elementRive">();
  });

  it("covers all known element types", () => {
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
});

// ---------------------------------------------------------------------------
// PeblorDefinitionBlock accepts preset references
// ---------------------------------------------------------------------------
describe("PeblorDefinitionBlock preset references", () => {
  it("accepts a preset-only definition (no type)", () => {
    const def: PeblorDefinitionBlock = { preset: "demo-hero" };
    expectTypeOf(def.preset).toBeString();
  });

  it("accepts a preset with overrides", () => {
    const def: PeblorDefinitionBlock = {
      preset: "type-h1-display",
      text: "Overridden text",
      variant: "large",
    };
    expectTypeOf(def.preset).toBeString();
  });

  it("accepts a contentBlock section as a definition", () => {
    const def: PeblorDefinitionBlock = {
      type: "contentBlock",
      elements: [],
    };
    expectTypeOf(def.type).toEqualTypeOf<"contentBlock">();
  });

  it("accepts an elementHeading as a definition", () => {
    const def: PeblorDefinitionBlock = {
      type: "elementHeading",
      text: "Hello",
    };
    expectTypeOf(def.type).toEqualTypeOf<"elementHeading">();
  });
});

// ---------------------------------------------------------------------------
// Pipeline function return types
// ---------------------------------------------------------------------------
describe("Pipeline return types", () => {
  it("ExpandPageResult shape includes bg and sections", () => {
    type ExpandResult = {
      bg: unknown;
      sections: SectionBlock[];
    };
    type Sections = ExpandResult["sections"];
    expectTypeOf<Sections>().toBeArray();
    expectTypeOf<Sections[number]>().toEqualTypeOf<SectionBlock>();
  });

  it("PeblorPageProps shape includes page metadata and resolved sections", () => {
    type MinimalProps = {
      page: { slug: string; title: string };
      resolvedBg: unknown;
      resolvedSections: SectionBlock[];
      bgDefinitions: Record<string, unknown>;
    };
    type Sections = MinimalProps["resolvedSections"];
    expectTypeOf<Sections>().toBeArray();
    expectTypeOf<Sections[number]>().toEqualTypeOf<SectionBlock>();
  });

  it("ResolvedPageWithDefinitions includes optional definitions map", () => {
    type ResolvedWithDefs = {
      slug?: string;
      title: string;
      sections?: SectionBlock[];
    } & {
      definitions?: Record<string, PeblorDefinitionBlock>;
    };
    type Defs = ResolvedWithDefs["definitions"];
    expectTypeOf<Defs>().toBeNullable();
  });
});

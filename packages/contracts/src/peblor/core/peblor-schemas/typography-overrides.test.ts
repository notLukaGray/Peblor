import { describe, expect, it } from "vitest";
import {
  elementBodySchema,
  elementHeadingSchema,
  elementLinkSchema,
} from "./element-content-schemas";
import { elementButtonSchema } from "./element-button-schemas";

// ---------------------------------------------------------------------------
// P1.3 — typographyOverridesSchema: explicit null accepted uniformly
//
// Before this refactor, heading used jsonNullishOptional for typography fields
// while body and link used bare .optional() — meaning explicit JSON null would
// fail validation on body/link but pass on heading.
// After P1.3 all three (heading/body/link) share typographyOverridesSchema,
// which uses jsonNullishOptional throughout, so explicit null must be accepted
// on all of them.
// ---------------------------------------------------------------------------

describe("typographyOverridesSchema — explicit null accepted uniformly", () => {
  const typographyNullPayload = {
    fontFamily: null,
    fontSize: null,
    fontWeight: null,
    lineHeight: null,
    letterSpacing: null,
    fontFeatureSettings: null,
    textOverflow: null,
    textStroke: null,
    verticalAlign: null,
    paragraphSpacing: null,
  };

  it("elementHeading accepts explicit null on all shared typography fields", () => {
    const result = elementHeadingSchema.safeParse({
      type: "elementHeading",
      text: "Hello",
      ...typographyNullPayload,
    });
    expect(result.success).toBe(true);
  });

  it("elementBody accepts explicit null on all shared typography fields (was .optional() before P1.3)", () => {
    const result = elementBodySchema.safeParse({
      type: "elementBody",
      text: "Hello",
      ...typographyNullPayload,
    });
    expect(result.success).toBe(true);
  });

  it("elementLink accepts explicit null on all shared typography fields (was .optional() before P1.3)", () => {
    const result = elementLinkSchema.safeParse({
      type: "elementLink",
      label: "Click",
      href: "/",
      ...typographyNullPayload,
    });
    expect(result.success).toBe(true);
  });

  it("elementButton accepts explicit null on fontFamily (its single shared typography field)", () => {
    const result = elementButtonSchema.safeParse({
      type: "elementButton",
      fontFamily: null,
    });
    expect(result.success).toBe(true);
  });

  it("elementHeading accepts string typography values", () => {
    const result = elementHeadingSchema.safeParse({
      type: "elementHeading",
      text: "Hello",
      fontFamily: "primary",
      fontSize: "2rem",
      fontWeight: "700",
      lineHeight: 1.4,
      letterSpacing: "-0.02em",
      fontFeatureSettings: '"ss01" on',
      textOverflow: "ellipsis",
      textStroke: "1px currentColor",
      verticalAlign: "middle",
      paragraphSpacing: "1em",
    });
    expect(result.success).toBe(true);
  });

  it("elementBody accepts numeric typography values", () => {
    const result = elementBodySchema.safeParse({
      type: "elementBody",
      text: "Body text",
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 1.6,
      letterSpacing: 0,
      paragraphSpacing: 8,
    });
    expect(result.success).toBe(true);
  });

  it("elementLink accepts typography overrides alongside link-specific fields", () => {
    const result = elementLinkSchema.safeParse({
      type: "elementLink",
      label: "Learn more",
      href: "https://example.com",
      fontFamily: "secondary",
      fontSize: "1rem",
      fontWeight: "600",
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Gap 1.1 — responsive typography fields: fontSize, lineHeight, letterSpacing,
// paragraphSpacing now accept tier maps as well as scalars.
// ---------------------------------------------------------------------------

describe("typographyOverridesSchema — responsive tier maps (gap 1.1)", () => {
  it("elementHeading accepts tier-map fontSize", () => {
    const result = elementHeadingSchema.safeParse({
      type: "elementHeading",
      text: "Responsive heading",
      fontSize: { base: "1rem", md: "2rem" },
    });
    expect(result.success).toBe(true);
  });

  it("elementHeading accepts tier-map lineHeight", () => {
    const result = elementHeadingSchema.safeParse({
      type: "elementHeading",
      text: "Responsive heading",
      lineHeight: { base: 1.2, md: 1.5 },
    });
    expect(result.success).toBe(true);
  });

  it("elementHeading accepts tier-map letterSpacing", () => {
    const result = elementHeadingSchema.safeParse({
      type: "elementHeading",
      text: "Responsive heading",
      letterSpacing: { base: "-0.01em", md: "-0.02em" },
    });
    expect(result.success).toBe(true);
  });

  it("elementBody accepts tier-map paragraphSpacing", () => {
    const result = elementBodySchema.safeParse({
      type: "elementBody",
      text: "Responsive body",
      paragraphSpacing: { base: "0.5em", md: "1em" },
    });
    expect(result.success).toBe(true);
  });

  it("scalar fontSize still parses unchanged (additive only)", () => {
    const result = elementHeadingSchema.safeParse({
      type: "elementHeading",
      text: "Scalar heading",
      fontSize: "1rem",
    });
    expect(result.success).toBe(true);
  });

  it("scalar numeric fontSize still parses unchanged", () => {
    const result = elementBodySchema.safeParse({
      type: "elementBody",
      text: "Scalar body",
      fontSize: 16,
    });
    expect(result.success).toBe(true);
  });

  it("elementLink accepts responsive tier-map fontSize and letterSpacing", () => {
    const result = elementLinkSchema.safeParse({
      type: "elementLink",
      label: "Learn more",
      href: "/",
      fontSize: { base: "0.875rem", md: "1rem" },
      letterSpacing: { base: "0", md: "-0.01em" },
    });
    expect(result.success).toBe(true);
  });

  it("mixed numeric/string tier map is accepted (e.g. lineHeight)", () => {
    const result = elementHeadingSchema.safeParse({
      type: "elementHeading",
      text: "Mixed",
      lineHeight: { base: 1.2, md: "1.6em" },
    });
    expect(result.success).toBe(true);
  });

  it("explicit null on responsive fields still treated as absent", () => {
    const result = elementHeadingSchema.safeParse({
      type: "elementHeading",
      text: "Nulled",
      fontSize: null,
      lineHeight: null,
      letterSpacing: null,
      paragraphSpacing: null,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Gap 1.2 — extended typography fields: fontStyle, fontVariationSettings,
// fontVariant, fontKerning, textWrap, hyphens, wordBreak, overflowWrap,
// textIndent, textUnderlineOffset
// ---------------------------------------------------------------------------

describe("typographyOverridesSchema — extended typography fields (gap 1.2)", () => {
  it("elementHeading accepts fontStyle: italic", () => {
    const result = elementHeadingSchema.safeParse({
      type: "elementHeading",
      text: "Italic heading",
      fontStyle: "italic",
    });
    expect(result.success).toBe(true);
  });

  it("elementHeading rejects invalid fontStyle", () => {
    const result = elementHeadingSchema.safeParse({
      type: "elementHeading",
      text: "Bad style",
      fontStyle: "bolder",
    });
    expect(result.success).toBe(false);
  });

  it("elementHeading accepts full set of extended typography fields", () => {
    const result = elementHeadingSchema.safeParse({
      type: "elementHeading",
      text: "Full typography",
      fontStyle: "oblique",
      fontVariationSettings: '"wght" 600, "wdth" 80',
      fontVariant: "small-caps",
      fontKerning: "normal",
      textWrap: "balance",
      hyphens: "auto",
      wordBreak: "break-all",
      overflowWrap: "anywhere",
      textIndent: "2em",
      textUnderlineOffset: "3px",
    });
    expect(result.success).toBe(true);
  });

  it("elementBody accepts fontStyle: italic and extended fields", () => {
    const result = elementBodySchema.safeParse({
      type: "elementBody",
      text: "Italic body",
      fontStyle: "italic",
      textWrap: "pretty",
      hyphens: "none",
      overflowWrap: "break-word",
      textIndent: 16,
      textUnderlineOffset: "0.2em",
    });
    expect(result.success).toBe(true);
  });

  it("elementBody rejects invalid textWrap value", () => {
    const result = elementBodySchema.safeParse({
      type: "elementBody",
      text: "Bad wrap",
      textWrap: "clip",
    });
    expect(result.success).toBe(false);
  });

  it("elementBody rejects invalid hyphens value", () => {
    const result = elementBodySchema.safeParse({
      type: "elementBody",
      text: "Bad hyphens",
      hyphens: "always",
    });
    expect(result.success).toBe(false);
  });

  it("elementLink accepts fontStyle: oblique and extended fields", () => {
    const result = elementLinkSchema.safeParse({
      type: "elementLink",
      label: "Styled link",
      href: "/page",
      fontStyle: "oblique",
      fontKerning: "none",
      textWrap: "nowrap",
      wordBreak: "keep-all",
    });
    expect(result.success).toBe(true);
  });

  it("extended fields accept explicit null (jsonNullishOptional convention)", () => {
    const result = elementHeadingSchema.safeParse({
      type: "elementHeading",
      text: "Nulled fields",
      fontStyle: null,
      fontVariationSettings: null,
      fontVariant: null,
      fontKerning: null,
      textWrap: null,
      hyphens: null,
      wordBreak: null,
      overflowWrap: null,
      textIndent: null,
      textUnderlineOffset: null,
    });
    expect(result.success).toBe(true);
  });
});

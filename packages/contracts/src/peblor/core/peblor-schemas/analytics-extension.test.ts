import { describe, expect, it } from "vitest";
import { peblorSchema } from "./page-definition-and-resolution-schemas";
import { baseSectionPropsSchema } from "./section-block-base-schemas";
import { elementBlockSchema } from "./element-block-schemas";
import { formFieldBlockSchema } from "./form-field-schemas";
import { triggerActionSchemaCore } from "./schema-primitives";

const MINIMAL_PAGE = {
  title: "Test Page",
  definitions: {},
  sectionOrder: [],
};

const MINIMAL_SECTION = {
  type: "contentBlock" as const,
  elements: [],
};

const MINIMAL_ELEMENT = {
  type: "elementHeading" as const,
  level: 1 as const,
  text: "Hello",
};

const MINIMAL_FORM_FIELD = {
  type: "formField" as const,
  fieldType: "text" as const,
};

describe("analytics extension — backwards compatibility", () => {
  it("existing page JSON without analytics parses", () => {
    const result = peblorSchema.safeParse(MINIMAL_PAGE);
    expect(result.success).toBe(true);
  });

  it("existing section JSON without analytics parses", () => {
    const result = baseSectionPropsSchema.safeParse(MINIMAL_SECTION);
    expect(result.success).toBe(true);
  });

  it("existing element JSON without analytics parses", () => {
    const result = elementBlockSchema.safeParse(MINIMAL_ELEMENT);
    expect(result.success).toBe(true);
  });

  it("existing form field JSON without analytics parses", () => {
    const result = formFieldBlockSchema.safeParse(MINIMAL_FORM_FIELD);
    expect(result.success).toBe(true);
  });

  it("page with analytics config parses", () => {
    const result = peblorSchema.safeParse({
      ...MINIMAL_PAGE,
      analytics: { event: "page_view", enabled: true },
    });
    expect(result.success).toBe(true);
  });

  it("section with analytics config parses", () => {
    const result = baseSectionPropsSchema.safeParse({
      ...MINIMAL_SECTION,
      analytics: {
        event: "content_cta_clicked",
        conditions: { minViewportWidth: 768 },
      },
    });
    expect(result.success).toBe(true);
  });

  it("element with analytics config parses", () => {
    const result = elementBlockSchema.safeParse({
      ...MINIMAL_ELEMENT,
      analytics: {
        event: "content_cta_clicked",
        props: { label: "Button Text" },
      },
    });
    expect(result.success).toBe(true);
  });

  it("form field with analytics config parses", () => {
    const result = formFieldBlockSchema.safeParse({
      ...MINIMAL_FORM_FIELD,
      analytics: {
        event: "form_submit_attempt",
        enabled: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it("analytics disabled parses", () => {
    const result = peblorSchema.safeParse({
      ...MINIMAL_PAGE,
      analytics: { enabled: false },
    });
    expect(result.success).toBe(true);
  });

  it("analytics with custom: prefix event parses", () => {
    const result = peblorSchema.safeParse({
      ...MINIMAL_PAGE,
      analytics: { event: "custom:signup_clicked" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects analytics conditions with invalid scrollProgress", () => {
    const result = peblorSchema.safeParse({
      ...MINIMAL_PAGE,
      analytics: { conditions: { scrollProgress: 1.5 } },
    });
    expect(result.success).toBe(false);
  });

  it("triggerActionSchemaCore accepts valid trackEvent with known event", () => {
    const result = triggerActionSchemaCore.safeParse({
      type: "trackEvent",
      payload: { event: "page_view" },
    });
    expect(result.success).toBe(true);
  });

  it("triggerActionSchemaCore accepts trackEvent with custom: prefix", () => {
    const result = triggerActionSchemaCore.safeParse({
      type: "trackEvent",
      payload: { event: "custom:my_event" },
    });
    expect(result.success).toBe(true);
  });

  it("triggerActionSchemaCore rejects trackEvent with unknown event name", () => {
    const result = triggerActionSchemaCore.safeParse({
      type: "trackEvent",
      payload: { event: "unknown_event" },
    });
    expect(result.success).toBe(false);
  });
});

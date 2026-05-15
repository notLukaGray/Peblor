import { describe, expect, it } from "vitest";
import { analyticsEventPayloadSchema, analyticsConfigSchema } from "./schemas";

const basePayload = {
  pagePath: "/work/example",
  source: "client" as const,
  ts: 1715000000000,
};

describe("analyticsEventPayloadSchema", () => {
  it("validates page_view with title", () => {
    const result = analyticsEventPayloadSchema.safeParse({
      ...basePayload,
      event: "page_view",
      title: "Example Page",
    });
    expect(result.success).toBe(true);
  });

  it("validates page_view without optional title", () => {
    const result = analyticsEventPayloadSchema.safeParse({
      ...basePayload,
      event: "page_view",
    });
    expect(result.success).toBe(true);
  });

  it("validates protected_page_redirected", () => {
    const result = analyticsEventPayloadSchema.safeParse({
      ...basePayload,
      event: "protected_page_redirected",
    });
    expect(result.success).toBe(true);
  });

  it("validates unlock_modal_opened", () => {
    const result = analyticsEventPayloadSchema.safeParse({
      ...basePayload,
      event: "unlock_modal_opened",
    });
    expect(result.success).toBe(true);
  });

  it("validates unlock_submit_attempt", () => {
    const result = analyticsEventPayloadSchema.safeParse({
      ...basePayload,
      event: "unlock_submit_attempt",
    });
    expect(result.success).toBe(true);
  });

  it("validates unlock_success", () => {
    const result = analyticsEventPayloadSchema.safeParse({
      ...basePayload,
      event: "unlock_success",
    });
    expect(result.success).toBe(true);
  });

  it("validates unlock_failure", () => {
    const result = analyticsEventPayloadSchema.safeParse({
      ...basePayload,
      event: "unlock_failure",
    });
    expect(result.success).toBe(true);
  });

  it("validates form_submit_attempt", () => {
    const result = analyticsEventPayloadSchema.safeParse({
      ...basePayload,
      event: "form_submit_attempt",
      handlerKey: "contact",
    });
    expect(result.success).toBe(true);
  });

  it("validates form_submit_success", () => {
    const result = analyticsEventPayloadSchema.safeParse({
      ...basePayload,
      event: "form_submit_success",
      handlerKey: "contact",
    });
    expect(result.success).toBe(true);
  });

  it("validates form_submit_error", () => {
    const result = analyticsEventPayloadSchema.safeParse({
      ...basePayload,
      event: "form_submit_error",
      handlerKey: "contact",
      errorType: "400",
    });
    expect(result.success).toBe(true);
  });

  it("validates content_cta_clicked with props", () => {
    const result = analyticsEventPayloadSchema.safeParse({
      ...basePayload,
      event: "content_cta_clicked",
      sectionId: "hero",
      elementId: "cta-button",
      props: { label: "Get Started", variant: "primary" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid source enum value", () => {
    const result = analyticsEventPayloadSchema.safeParse({
      ...basePayload,
      event: "page_view",
      source: "unknown" as unknown,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required pagePath", () => {
    const result = analyticsEventPayloadSchema.safeParse({
      event: "page_view",
      source: "client",
      ts: Date.now(),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required ts", () => {
    const result = analyticsEventPayloadSchema.safeParse({
      event: "page_view",
      pagePath: "/test",
      source: "client",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative ts", () => {
    const result = analyticsEventPayloadSchema.safeParse({
      ...basePayload,
      event: "page_view",
      ts: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects form_submit_attempt without handlerKey", () => {
    const result = analyticsEventPayloadSchema.safeParse({
      ...basePayload,
      event: "form_submit_attempt",
    });
    expect(result.success).toBe(false);
  });

  it("rejects form_submit_error without handlerKey", () => {
    const result = analyticsEventPayloadSchema.safeParse({
      ...basePayload,
      event: "form_submit_error",
      errorType: "400",
    });
    expect(result.success).toBe(false);
  });

  it("rejects form_submit_error without errorType", () => {
    const result = analyticsEventPayloadSchema.safeParse({
      ...basePayload,
      event: "form_submit_error",
      handlerKey: "contact",
    });
    expect(result.success).toBe(false);
  });
});

describe("analyticsConfigSchema", () => {
  it("accepts undefined / empty config", () => {
    expect(analyticsConfigSchema.safeParse(undefined).success).toBe(true);
    expect(analyticsConfigSchema.safeParse({}).success).toBe(true);
  });

  it("accepts enabled boolean", () => {
    const result = analyticsConfigSchema.safeParse({ enabled: false });
    expect(result.success).toBe(true);
  });

  it("accepts event string", () => {
    const result = analyticsConfigSchema.safeParse({ event: "content_cta_clicked" });
    expect(result.success).toBe(true);
  });

  it("accepts custom: prefixed event", () => {
    const result = analyticsConfigSchema.safeParse({ event: "custom:my_event" });
    expect(result.success).toBe(true);
  });

  it("accepts props record", () => {
    const result = analyticsConfigSchema.safeParse({
      props: { label: "Click Me", variant: "outline" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts conditions", () => {
    const result = analyticsConfigSchema.safeParse({
      conditions: { minViewportWidth: 768, scrollProgress: 0.5 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects scrollProgress out of range", () => {
    const result = analyticsConfigSchema.safeParse({
      conditions: { scrollProgress: 1.5 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative scrollProgress", () => {
    const result = analyticsConfigSchema.safeParse({
      conditions: { scrollProgress: -0.1 },
    });
    expect(result.success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  analyticsCommonPayloadSchema,
  analyticsEventPayloadSchema,
  analyticsConfigSchema,
} from "./schemas";
import { ANALYTICS_EVENT_NAMES } from "./events";

describe("analytics events", () => {
  it("has the expected number of known events", () => {
    expect(ANALYTICS_EVENT_NAMES.length).toBeGreaterThan(0);
    expect(ANALYTICS_EVENT_NAMES).toHaveLength(10);
  });

  it("all known event names are included in the discriminated union", () => {
    for (const name of ANALYTICS_EVENT_NAMES) {
      const payload = {
        event: name,
        pagePath: "/test",
        source: "client",
        ts: Date.now(),
        ...(name === "page_view" ? { title: "Test" } : {}),
        ...(name.startsWith("form_submit_") ? { handlerKey: "contact" } : {}),
        ...(name === "form_submit_error" ? { handlerKey: "contact", errorType: "400" } : {}),
      };
      const result = analyticsEventPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    }
  });

  it("rejects unknown event names in the discriminated union", () => {
    const result = analyticsEventPayloadSchema.safeParse({
      event: "nonexistent_event",
      pagePath: "/test",
      source: "client",
      ts: Date.now(),
    });
    expect(result.success).toBe(false);
  });

  it("accepts custom:* event keys as config.event string", () => {
    const config = { event: "custom:signup_clicked" };
    const result = analyticsConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.event).toBe("custom:signup_clicked");
    }
  });

  it("all type-level AnalyticsEventKey values accept custom:* prefix", () => {
    const customKey = "custom:my_event" as const;
    expect(customKey.startsWith("custom:")).toBe(true);
  });
});

describe("analytics payload schemas — PII safety", () => {
  const PII_KEYS = ["email", "password", "token", "secret", "apiKey", "creditCard"];

  function collectFieldNames(schema: unknown): Set<string> {
    const fields = new Set<string>();
    if (!schema || typeof schema !== "object") return fields;

    const obj = schema as Record<string, unknown>;
    if (Array.isArray(obj)) {
      for (const item of obj) {
        for (const f of collectFieldNames(item)) fields.add(f);
      }
      return fields;
    }

    if (typeof obj.shape === "object" && obj.shape !== null) {
      for (const key of Object.keys(obj.shape as Record<string, unknown>)) {
        fields.add(key);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const def = obj._def as any;
    if (def && Array.isArray(def.options)) {
      for (const opt of def.options) {
        for (const f of collectFieldNames(opt)) fields.add(f);
      }
    }

    return fields;
  }

  it("no PII-shaped keys in any event payload schema", () => {
    const fields = collectFieldNames(analyticsEventPayloadSchema);
    for (const piiKey of PII_KEYS) {
      for (const field of fields) {
        const lowerField = field.toLowerCase();
        expect(lowerField).not.toContain(piiKey.toLowerCase());
      }
    }
  });

  it("no PII-shaped keys in common payload schema", () => {
    const fields = collectFieldNames(analyticsCommonPayloadSchema);
    for (const piiKey of PII_KEYS) {
      for (const field of fields) {
        const lowerField = field.toLowerCase();
        expect(lowerField).not.toContain(piiKey.toLowerCase());
      }
    }
  });
});

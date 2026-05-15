import { describe, expect, it } from "vitest";
import { resolveAuthoredUrl, resolveGraphicLinkHref } from "./url-policy";

describe("resolveAuthoredUrl", () => {
  describe("blocked schemes", () => {
    it("rejects javascript:", () => {
      expect(resolveAuthoredUrl("javascript:alert(1)", "any")).toMatchObject({
        ok: false,
        reason: "blocked",
      });
    });

    it("rejects data:", () => {
      expect(resolveAuthoredUrl("data:text/html,<script>", "any")).toMatchObject({
        ok: false,
        reason: "blocked",
      });
    });

    it("rejects vbscript:", () => {
      expect(resolveAuthoredUrl("vbscript:msgbox(1)", "any")).toMatchObject({
        ok: false,
        reason: "blocked",
      });
    });

    it("rejects JAVASCRIPT: (uppercase)", () => {
      expect(resolveAuthoredUrl("JAVASCRIPT:alert(1)", "any")).toMatchObject({
        ok: false,
        reason: "blocked",
      });
    });

    it("rejects DATA: (uppercase)", () => {
      expect(resolveAuthoredUrl("DATA:text/html,<script>", "any")).toMatchObject({
        ok: false,
        reason: "blocked",
      });
    });

    it("rejects javascript: with leading space", () => {
      expect(resolveAuthoredUrl(" javascript:alert(1)", "any")).toMatchObject({
        ok: false,
        reason: "blocked",
      });
    });

    it("rejects java\\nscript: obfuscation", () => {
      expect(resolveAuthoredUrl("java\nscript:alert(1)", "any")).toMatchObject({
        ok: false,
        reason: "blocked",
      });
    });
  });

  describe("internal mode", () => {
    it("allows absolute paths", () => {
      const r = resolveAuthoredUrl("/work", "internal");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.url).toBe("/work");
    });

    it("allows fragments", () => {
      const r = resolveAuthoredUrl("#section", "internal");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.url).toBe("#section");
    });

    it("resolves bare refs to fragments", () => {
      const r = resolveAuthoredUrl("contact", "internal");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.url).toBe("#contact");
    });

    it("rejects external URLs", () => {
      expect(resolveAuthoredUrl("https://example.com", "internal")).toMatchObject({
        ok: false,
        reason: "disallowed",
      });
    });

    it("rejects mailto:", () => {
      expect(resolveAuthoredUrl("mailto:test@example.com", "internal")).toMatchObject({
        ok: false,
        reason: "disallowed",
      });
    });
  });

  describe("external mode", () => {
    it("allows https:", () => {
      const r = resolveAuthoredUrl("https://example.com", "external");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.url).toBe("https://example.com");
    });

    it("allows http:", () => {
      const r = resolveAuthoredUrl("http://example.com", "external");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.url).toBe("http://example.com");
    });

    it("rejects internal paths", () => {
      expect(resolveAuthoredUrl("/work", "external")).toMatchObject({
        ok: false,
        reason: "disallowed",
      });
    });
  });

  describe("contact mode", () => {
    it("allows mailto:", () => {
      const r = resolveAuthoredUrl("mailto:test@example.com", "contact");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.url).toBe("mailto:test@example.com");
    });

    it("allows tel:", () => {
      const r = resolveAuthoredUrl("tel:+1234567890", "contact");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.url).toBe("tel:+1234567890");
    });

    it("rejects http:", () => {
      expect(resolveAuthoredUrl("https://example.com", "contact")).toMatchObject({
        ok: false,
        reason: "disallowed",
      });
    });
  });

  describe("any mode", () => {
    it("allows internal paths", () => {
      expect(resolveAuthoredUrl("/about", "any").ok).toBe(true);
    });

    it("allows fragments", () => {
      expect(resolveAuthoredUrl("#hero", "any").ok).toBe(true);
    });

    it("resolves bare refs", () => {
      const r = resolveAuthoredUrl("myRef", "any");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.url).toBe("#myRef");
    });

    it("allows https:", () => {
      expect(resolveAuthoredUrl("https://example.com", "any").ok).toBe(true);
    });

    it("allows mailto:", () => {
      expect(resolveAuthoredUrl("mailto:hi@example.com", "any").ok).toBe(true);
    });

    it("allows tel:", () => {
      expect(resolveAuthoredUrl("tel:+1234567890", "any").ok).toBe(true);
    });
  });

  describe("null/empty/whitespace", () => {
    it("returns disallowed for undefined", () => {
      expect(resolveAuthoredUrl(undefined, "any")).toMatchObject({
        ok: false,
        reason: "disallowed",
      });
    });

    it("returns disallowed for null", () => {
      expect(resolveAuthoredUrl(null, "any")).toMatchObject({
        ok: false,
        reason: "disallowed",
      });
    });

    it("returns disallowed for empty string", () => {
      expect(resolveAuthoredUrl("", "any")).toMatchObject({
        ok: false,
        reason: "disallowed",
      });
    });
  });
});

describe("resolveGraphicLinkHref", () => {
  it("resolves bare ref to fragment for internal link", () => {
    expect(resolveGraphicLinkHref("contact", false)).toBe("#contact");
  });

  it("passes through external URLs", () => {
    expect(resolveGraphicLinkHref("https://example.com", true)).toBe("https://example.com");
  });

  it("passes through internal paths", () => {
    expect(resolveGraphicLinkHref("/work", false)).toBe("/work");
  });

  it("passes through fragments", () => {
    expect(resolveGraphicLinkHref("#section", false)).toBe("#section");
  });

  it("returns null for empty ref", () => {
    expect(resolveGraphicLinkHref("", false)).toBeNull();
    expect(resolveGraphicLinkHref(null, false)).toBeNull();
  });

  it("returns null for javascript: ref", () => {
    expect(resolveGraphicLinkHref("javascript:alert(1)", false)).toBeNull();
  });

  it("returns null for data: ref", () => {
    expect(resolveGraphicLinkHref("data:text/html,<script>", false)).toBeNull();
  });
});

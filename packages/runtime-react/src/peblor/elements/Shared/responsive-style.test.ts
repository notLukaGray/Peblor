import { describe, expect, it } from "vitest";
import { buildResponsiveStyle } from "./responsive-style";

describe("buildResponsiveStyle", () => {
  it("returns nothing for empty / all-nullish input", () => {
    expect(buildResponsiveStyle({ styles: {} })).toEqual({
      className: undefined,
      css: undefined,
      needsContainer: false,
    });
    expect(buildResponsiveStyle({ id: "x", styles: { color: null, width: undefined } })).toEqual({
      className: undefined,
      css: undefined,
      needsContainer: false,
    });
  });

  it("emits a base-only rule for a scalar value", () => {
    const result = buildResponsiveStyle({ id: "x", styles: { color: "red" } });
    expect(result.className).toBe("pb-r-x");
    expect(result.css).toBe(".pb-r-x{color:red}");
    expect(result.needsContainer).toBe(false);
  });

  it("appends px to numeric lengths but leaves unitless properties bare", () => {
    const result = buildResponsiveStyle({
      id: "x",
      styles: { fontSize: 14, lineHeight: 1.4, opacity: 0.5, marginTop: 0 },
    });
    expect(result.css).toContain("font-size:14px");
    expect(result.css).toContain("line-height:1.4");
    expect(result.css).toContain("opacity:0.5");
    expect(result.css).toContain("margin-top:0");
    expect(result.css).not.toContain("0px");
  });

  it("maps a { base, md } tier map to base + md rules", () => {
    const result = buildResponsiveStyle({ id: "x", styles: { fontSize: { base: 14, md: 20 } } });
    expect(result.css).toBe(
      ".pb-r-x{font-size:14px}@media (min-width:768px){.pb-r-x{font-size:20px}}"
    );
  });

  it("maps a { base, md } padding tier map", () => {
    const result = buildResponsiveStyle({
      id: "x",
      styles: { padding: { base: 8, md: 24 } },
    });
    expect(result.css).toBe(".pb-r-x{padding:8px}@media (min-width:768px){.pb-r-x{padding:24px}}");
  });

  it("emits named viewport tiers mobile-first in ascending order", () => {
    const result = buildResponsiveStyle({
      id: "x",
      styles: { fontSize: { base: 14, md: 18, xl: 24 } },
    });
    expect(result.css).toBe(
      ".pb-r-x{font-size:14px}" +
        "@media (min-width:768px){.pb-r-x{font-size:18px}}" +
        "@media (min-width:1280px){.pb-r-x{font-size:24px}}"
    );
    // md (768) must come before xl (1280)
    expect(result.css!.indexOf("768px")).toBeLessThan(result.css!.indexOf("1280px"));
  });

  it("handles a tier map without a base value (override-only)", () => {
    const result = buildResponsiveStyle({ id: "x", styles: { display: { lg: "flex" } } });
    expect(result.css).toBe("@media (min-width:1024px){.pb-r-x{display:flex}}");
  });

  it("emits @container rules, container-type, and flags needsContainer for container variants", () => {
    const result = buildResponsiveStyle({
      id: "x",
      styles: { padding: { "@container": { base: 8, lg: 24 } } },
    });
    expect(result.needsContainer).toBe(true);
    // container-type declaration is emitted first, then base + @container rules
    expect(result.css).toBe(
      ".pb-r-x{container-type:inline-size}.pb-r-x{padding:8px}@container (min-width:1024px){.pb-r-x{padding:24px}}"
    );
  });

  it("merges multiple properties into the shared base rule", () => {
    const result = buildResponsiveStyle({
      id: "x",
      styles: { color: "red", fontWeight: 700 },
    });
    expect(result.css).toBe(".pb-r-x{color:red;font-weight:700}");
  });

  it("strips characters that could break out of the rule or <style> block", () => {
    const result = buildResponsiveStyle({
      id: "x",
      styles: { color: "red}</style><script>", background: "url(x)" },
    });
    expect(result.css).not.toContain("<");
    expect(result.css).not.toContain("}</style");
    expect(result.css).toContain("background:url(x)");
  });

  it("drops declarations whose property name has no safe characters", () => {
    const result = buildResponsiveStyle({ id: "x", styles: { "!!!": "red", color: "blue" } });
    expect(result.css).toBe(".pb-r-x{color:blue}");
  });

  it("derives a stable hashed class name when no id is given", () => {
    const a = buildResponsiveStyle({ styles: { color: "red" } });
    const b = buildResponsiveStyle({ styles: { color: "red" } });
    expect(a.className).toBeDefined();
    expect(a.className).toBe(b.className);
    expect(a.className).toMatch(/^pb-r-/);

    const c = buildResponsiveStyle({ styles: { color: "blue" } });
    expect(c.className).not.toBe(a.className);
  });
});

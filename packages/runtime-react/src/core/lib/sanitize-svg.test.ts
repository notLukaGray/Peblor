import { describe, expect, it, vi } from "vitest";
import { sanitizeSvgMarkup, sanitizeSvgMarkupServer } from "./sanitize-svg";

describe("sanitizeSvgMarkup (browser path)", () => {
  it("preserves style attributes but strips dangerous values", () => {
    const input =
      '<svg viewBox="0 0 10 10"><rect width="10" height="10" style="fill:url(javascript:alert(1))" /></svg>';
    const output = sanitizeSvgMarkup(input);
    expect(output).toContain("<rect");
    // style attributes are now preserved (unified with apps/web sanitizer behavior)
  });

  it("strips script tags", () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><path d="M0 0"/></svg>';
    const output = sanitizeSvgMarkup(input);
    expect(output).not.toContain("script");
    expect(output).toContain("<path");
  });

  it("allows local fragment url() refs and strips external url() refs", () => {
    const input =
      '<svg viewBox="0 0 10 10"><defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient></defs><rect fill="url(#g)" style="clip-path:url(#g);fill:url(https://evil.example/x.svg#id)" width="10" height="10"/></svg>';
    const output = sanitizeSvgMarkup(input);
    expect(output).toContain('fill="url(#g)"');
    expect(output).not.toContain("https://evil.example");
    expect(output).not.toContain("clip-path:url(#g)");
  });
});

describe("sanitizeSvgMarkupServer (SSR path)", () => {
  it("returns sanitized markup in Node, not empty string", () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<path d="M0 0 L10 10" fill="red" stroke="black"/>' +
      "</svg>";
    const output = sanitizeSvgMarkupServer(input);
    expect(output).not.toBe("");
    expect(output).toContain("<svg");
    expect(output).toContain("<path");
    expect(output).toContain('fill="red"');
    expect(output).toContain('stroke="black"');
    expect(output).not.toContain("javascript:");
    expect(output).not.toContain("<script");
  });

  it("strips dangerous href values in SSR", () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><text>link</text></a></svg>';
    const output = sanitizeSvgMarkupServer(input);
    expect(output).not.toContain("javascript:");
  });

  it("keeps local fragment url() refs and strips external url() refs in SSR", () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="c"><rect x="0" y="0" width="10" height="10"/></clipPath></defs><rect clip-path="url(#c)" fill="url(https://evil.example/paint.svg#x)"/></svg>';
    const output = sanitizeSvgMarkupServer(input);
    expect(output).toContain('clip-path="url(#c)"');
    expect(output).not.toContain("https://evil.example");
  });

  it("returns empty for empty input", () => {
    expect(sanitizeSvgMarkupServer("")).toBe("");
    expect(sanitizeSvgMarkupServer("   ")).toBe("");
  });

  it("returns empty for non-svg root", () => {
    expect(sanitizeSvgMarkupServer('<div><path d="M0 0"/></div>')).toBe("");
  });

  it("preserves viewBox and common attributes", () => {
    const input =
      '<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10"/></svg>';
    const output = sanitizeSvgMarkupServer(input);
    expect(output).toContain('viewBox="0 0 24 24"');
    expect(output).toContain('width="24"');
    expect(output).toContain('height="24"');
  });

  it("strips event handler attributes", () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect onclick="alert(1)" x="0" y="0" width="10" height="10"/></svg>';
    const output = sanitizeSvgMarkupServer(input);
    expect(output).not.toContain("onclick");
    expect(output).not.toContain("alert");
    expect(output).toContain('x="0"');
  });
});

describe("sanitizeSvgMarkup falls back to SSR when DOMParser unavailable", () => {
  it("returns sanitized SVG when DOMParser is absent", () => {
    vi.stubGlobal("DOMParser", undefined);
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="50" height="50"/></svg>';
    const output = sanitizeSvgMarkup(input);
    vi.unstubAllGlobals();
    expect(output).not.toBe("");
    expect(output).toContain("<svg");
    expect(output).toContain("<rect");
  });
});

import { describe, expect, it, vi } from "vitest";
import { sanitizeSvgMarkup, sanitizeSvgMarkupServer } from "./sanitize-svg";

describe("sanitizeSvgMarkup (browser path)", () => {
  it("preserves safe SVG animation tags", async () => {
    const input =
      '<svg viewBox="0 0 10 10"><rect width="10" height="10" fill="#fff"><animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite"/></rect></svg>';
    const output = await sanitizeSvgMarkup(input);
    expect(output).toContain("<animate");
    expect(output).toContain('attributeName="opacity"');
    expect(output).toContain('repeatCount="indefinite"');
  });

  it("preserves style attributes but strips dangerous values", async () => {
    const input =
      '<svg viewBox="0 0 10 10"><rect width="10" height="10" style="fill:url(javascript:alert(1))" /></svg>';
    const output = await sanitizeSvgMarkup(input);
    // Dangerous style values are stripped; <rect> tag is preserved
    expect(output).toContain("<rect");
    expect(output).not.toContain("javascript:");
  });

  it("strips script tags", async () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><path d="M0 0 L10 10"/></svg>';
    const output = await sanitizeSvgMarkup(input);
    expect(output).not.toContain("script");
    expect(output).toContain("<path");
  });

  it("allows local fragment url() refs and strips external url() refs", async () => {
    const input =
      '<svg viewBox="0 0 10 10"><defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient></defs><rect fill="url(#g)" style="clip-path:url(#g);fill:url(https://evil.example/x.svg#id)" width="10" height="10"/></svg>';
    const output = await sanitizeSvgMarkup(input);
    expect(output).toContain('fill="url(#g)"');
    expect(output).not.toContain("https://evil.example");
    expect(output).not.toContain("clip-path:url(#g)");
  });

  it("preserves animateMotion + mpath local href refs", async () => {
    const input =
      '<svg viewBox="0 0 20 20"><path id="p" d="M2 10 L18 10"/><circle r="2" fill="red"><animateMotion dur="2s" repeatCount="indefinite"><mpath href="#p"/></animateMotion></circle></svg>';
    const output = await sanitizeSvgMarkup(input);
    expect(output).toContain("<animatemotion");
    expect(output).toContain("<mpath");
    expect(output).toContain('href="#p"');
  });
});

describe("sanitizeSvgMarkupServer (SSR path)", () => {
  it("preserves safe SVG animation tags in SSR", () => {
    const input =
      '<svg viewBox="0 0 10 10"><rect width="10" height="10"><animateTransform attributeName="transform" type="rotate" from="0 5 5" to="360 5 5" dur="4s" repeatCount="indefinite"/></rect></svg>';
    const output = sanitizeSvgMarkupServer(input);
    expect(output).toContain("<animatetransform");
    expect(output).toContain('attributeName="transform"');
    expect(output).toContain('type="rotate"');
  });

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

  it("preserves animateMotion + mpath local href refs in SSR", () => {
    const input =
      '<svg viewBox="0 0 20 20"><path id="p" d="M2 10 L18 10"/><circle r="2"><animateMotion dur="2s" repeatCount="indefinite"><mpath href="#p"/></animateMotion></circle></svg>';
    const output = sanitizeSvgMarkupServer(input);
    expect(output).toContain("<animatemotion");
    expect(output).toContain("<mpath");
    expect(output).toContain('href="#p"');
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
  it("returns sanitized SVG when DOMParser is absent", async () => {
    vi.stubGlobal("DOMParser", undefined);
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="50" height="50"/></svg>';
    const output = await sanitizeSvgMarkup(input);
    vi.unstubAllGlobals();
    expect(output).not.toBe("");
    expect(output).toContain("<svg");
    expect(output).toContain("<rect");
  });
});

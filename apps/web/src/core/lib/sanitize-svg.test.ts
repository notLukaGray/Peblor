import { describe, it, expect } from "vitest";
import {
  sanitizeSvgMarkup,
  isAllowedTag,
  isAllowedAttr,
  sanitizeAttrValue,
  escapeText,
} from "./sanitize-svg";

describe("sanitize-svg", () => {
  describe("escapeText", () => {
    it("escapes < and > and & in text", () => {
      expect(escapeText("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
      expect(escapeText("a & b")).toBe("a &amp; b");
      expect(escapeText('"quoted"')).toBe("&quot;quoted&quot;");
    });

    it("returns empty string for empty input", () => {
      expect(escapeText("")).toBe("");
    });
  });

  describe("isAllowedTag", () => {
    it("allows svg, path, circle, rect, g, etc", () => {
      expect(isAllowedTag("svg")).toBe(true);
      expect(isAllowedTag("path")).toBe(true);
      expect(isAllowedTag("circle")).toBe(true);
      expect(isAllowedTag("rect")).toBe(true);
      expect(isAllowedTag("g")).toBe(true);
    });

    it("rejects script and unknown tags", () => {
      expect(isAllowedTag("script")).toBe(false);
      expect(isAllowedTag("iframe")).toBe(false);
      expect(isAllowedTag("foreignObject")).toBe(false);
    });

    it("is case-insensitive", () => {
      expect(isAllowedTag("SVG")).toBe(true);
      expect(isAllowedTag("Path")).toBe(true);
    });
  });

  describe("isAllowedAttr", () => {
    it("allows viewBox, width, height, d, fill, stroke", () => {
      expect(isAllowedAttr("svg", "viewBox")).toBe(true);
      expect(isAllowedAttr("svg", "width")).toBe(true);
      expect(isAllowedAttr("svg", "height")).toBe(true);
      expect(isAllowedAttr("path", "d")).toBe(true);
      expect(isAllowedAttr("circle", "fill")).toBe(true);
      expect(isAllowedAttr("rect", "stroke")).toBe(true);
    });

    it("strips on* event handler attributes", () => {
      expect(isAllowedAttr("svg", "onclick")).toBe(false);
      expect(isAllowedAttr("path", "onload")).toBe(false);
      expect(isAllowedAttr("g", "onmouseover")).toBe(false);
    });

    it("normalizes clip-path to clippath", () => {
      expect(isAllowedAttr("path", "clip-path")).toBe(true);
    });

    it("allows fill-opacity and stroke-opacity", () => {
      expect(isAllowedAttr("rect", "fill-opacity")).toBe(true);
      expect(isAllowedAttr("path", "stroke-opacity")).toBe(true);
    });
  });

  describe("sanitizeAttrValue", () => {
    it("returns null for javascript: and data: URIs", () => {
      expect(sanitizeAttrValue("a", "href", "javascript:alert(1)")).toBe(null);
      expect(sanitizeAttrValue("a", "href", "data:text/html,<script>")).toBe(null);
      expect(sanitizeAttrValue("rect", "fill", "javascript:void(0)")).toBe(null);
    });

    it("returns null for xlink:href with javascript: (security)", () => {
      expect(sanitizeAttrValue("use", "xlink:href", "javascript:alert(1)")).toBe(null);
      expect(sanitizeAttrValue("a", "xlink:href", "javascript:evil()")).toBe(null);
    });

    it("preserves safe href values (e.g. in-page anchor)", () => {
      expect(sanitizeAttrValue("a", "href", "#section")).toBe("#section");
      expect(sanitizeAttrValue("a", "xlink:href", "#clip-1")).toBe("#clip-1");
    });

    it("escapes quotes and angle brackets in attr values", () => {
      expect(sanitizeAttrValue("path", "d", 'M0 0 "quoted"')).toBe("M0 0 &quot;quoted&quot;");
      expect(sanitizeAttrValue("title", "text", "<script>")).toBe("&lt;script>");
    });

    it("preserves safe values", () => {
      expect(sanitizeAttrValue("circle", "fill", "red")).toBe("red");
      expect(sanitizeAttrValue("svg", "viewBox", "0 0 100 100")).toBe("0 0 100 100");
    });
  });

  describe("sanitizeSvgMarkup", () => {
    it("strips script tags", () => {
      const markup = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><path d="M0 0"/></svg>`;
      const result = sanitizeSvgMarkup(markup);
      expect(result).not.toContain("script");
      expect(result).not.toContain("alert");
      expect(result).toContain("<path");
    });

    it("strips on* event handler attributes", () => {
      const markup = `<svg xmlns="http://www.w3.org/2000/svg"><rect onclick="alert(1)" x="0" y="0" width="10" height="10"/></svg>`;
      const result = sanitizeSvgMarkup(markup);
      expect(result).not.toContain("onclick");
      expect(result).not.toContain("alert");
      expect(result).toContain('x="0"');
    });

    it("preserves basic svg/path attributes", () => {
      const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><path d="M0 0 L10 10" fill="red" stroke="black"/></svg>`;
      const result = sanitizeSvgMarkup(markup);
      expect(result).toContain("viewBox");
      expect(result).toContain("width");
      expect(result).toContain("height");
      expect(result).toContain('d="M0 0 L10 10"');
      expect(result).toContain('fill="red"');
      expect(result).toContain('stroke="black"');
    });

    it("preserves fill-opacity and stroke-opacity attributes", () => {
      const markup = `<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="50" fill="#D9D9D9" fill-opacity="0.2" stroke="#000" stroke-opacity="0.4"/></svg>`;
      const result = sanitizeSvgMarkup(markup);
      expect(result).toContain('fill-opacity="0.2"');
      expect(result).toContain('stroke-opacity="0.4"');
    });

    it("preserves viewBox width height if allowed", () => {
      const markup = `<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10"/></svg>`;
      const result = sanitizeSvgMarkup(markup);
      expect(result).toContain('viewBox="0 0 24 24"');
      expect(result).toContain('width="24"');
      expect(result).toContain('height="24"');
    });

    it("escapes text content properly", () => {
      const markup = `<svg xmlns="http://www.w3.org/2000/svg"><title>&lt;script&gt;evil&lt;/script&gt;</title></svg>`;
      const result = sanitizeSvgMarkup(markup);
      // Title text should be escaped (we escape in TEXT_NODE)
      expect(result).toContain("title");
      // If input had raw <script>, our escapeText would convert it
      const markupWithRaw = `<svg xmlns="http://www.w3.org/2000/svg"><title><script>evil</script></title></svg>`;
      const resultRaw = sanitizeSvgMarkup(markupWithRaw);
      // script tag is stripped, so "evil" might appear as text - but script tag itself is gone
      expect(resultRaw).not.toContain("<script>");
    });

    it("returns empty string for non-svg root", () => {
      const markup = `<div><path d="M0 0"/></div>`;
      expect(sanitizeSvgMarkup(markup)).toBe("");
    });

    it("returns empty string for empty input", () => {
      expect(sanitizeSvgMarkup("")).toBe("");
      expect(sanitizeSvgMarkup("   ")).toBe("");
    });

    it("supports JSON-escaped SVG strings", () => {
      const escaped =
        '<svg width=\\"300\\" height=\\"150\\" viewBox=\\"0 0 300 150\\" xmlns=\\"http://www.w3.org/2000/svg\\">\\n<rect width=\\"300\\" height=\\"150\\" rx=\\"50\\" fill=\\"#000\\" fill-opacity=\\"0.01\\"/>\\n</svg>';
      const result = sanitizeSvgMarkup(escaped);
      expect(result).toContain("<svg");
      expect(result).toContain("<rect");
      expect(result).toContain('fill-opacity="0.01"');
    });

    it("strips dangerous href and xlink:href values", () => {
      const markupA = `<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><text>link</text></a></svg>`;
      expect(sanitizeSvgMarkup(markupA)).not.toContain("javascript:");
      // use has xlink:href - use is not in TAGS_ALLOWED so stripped; defense in sanitizeAttrValue
      const markupUse = `<svg xmlns="http://www.w3.org/2000/svg"><use xlink:href="javascript:evil()"/></svg>`;
      expect(sanitizeSvgMarkup(markupUse)).not.toContain("javascript:");
    });
  });
});

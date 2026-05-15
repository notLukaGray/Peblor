import { describe, expect, it } from "vitest";
import { normalizePagePath } from "./analytics-wrapper";

describe("normalizePagePath", () => {
  it("returns pathname for same-origin absolute referer", () => {
    expect(normalizePagePath("https://example.com/work/example")).toBe("/work/example");
  });

  it("strips query string", () => {
    expect(normalizePagePath("https://example.com/contact?token=abc&ref=123")).toBe("/contact");
  });

  it("strips hash fragment", () => {
    expect(normalizePagePath("https://example.com/page#section")).toBe("/page");
  });

  it("strips both query and hash", () => {
    expect(normalizePagePath("https://example.com/dev?debug=1#log")).toBe("/dev");
  });

  it("returns pathname for relative path referer", () => {
    expect(normalizePagePath("/work/project-alpha")).toBe("/work/project-alpha");
  });

  it("returns empty string for empty referer", () => {
    expect(normalizePagePath("")).toBe("");
  });

  it("returns empty string for javascript: URL", () => {
    expect(normalizePagePath("javascript:alert(1)")).toBe("");
  });

  it("returns root for root path referer", () => {
    expect(normalizePagePath("https://example.com/")).toBe("/");
  });

  it("does not include origin in result for absolute URL", () => {
    const result = normalizePagePath("https://other-site.com/some/path");
    expect(result).not.toContain("other-site.com");
    expect(result).toBe("/some/path");
  });
});

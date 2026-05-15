import { describe, expect, it } from "vitest";
import { sanitizeRichTextMarkup } from "./sanitize-rich-text";

describe("sanitizeRichTextMarkup", () => {
  it("removes script tags and event handlers", () => {
    const raw =
      '<span onclick="alert(1)" style="font-size:18px;color:#fff">Hello</span><script>alert(1)</script>';
    const safe = sanitizeRichTextMarkup(raw);
    expect(safe).toBe('<span style="font-size:18px;color:#fff">Hello</span>');
    expect(safe).not.toContain("onclick=");
    expect(safe).not.toContain("<script");
  });

  it("blocks javascript hrefs but keeps safe links", () => {
    const raw =
      '<a href="javascript:alert(1)" target="_blank">Bad</a><a href="https://example.com" target="_blank" rel="noopener">Good</a>';
    const safe = sanitizeRichTextMarkup(raw);
    expect(safe).not.toContain('href="javascript:alert(1)"');
    expect(safe).toContain('href="https://example.com"');
    expect(safe).toBe(
      '<a target="_blank">Bad</a><a href="https://example.com" target="_blank" rel="noopener">Good</a>'
    );
  });

  it("keeps only allowed style declarations", () => {
    const raw =
      '<span style="font-size:30px;line-height:40px;background:url(javascript:1);position:absolute;color:#fff">Copy</span>';
    const safe = sanitizeRichTextMarkup(raw);
    expect(safe).toContain('style="font-size:30px;line-height:40px;color:#fff"');
    expect(safe).not.toContain("background:");
    expect(safe).not.toContain("position:");
  });

  it("preserves semantic emphasis tags", () => {
    const raw = '<span style="font-size:50px"><strong><em>Text</em></strong></span>';
    const safe = sanitizeRichTextMarkup(raw);
    expect(safe).toContain("<strong>");
    expect(safe).toContain("<em>");
    expect(safe).toContain("Text");
  });

  it("removes disallowed tags but keeps allowed inner text", () => {
    const raw =
      '<div><p>Alpha</p><iframe src="https://example.com"></iframe><custom>Beta</custom></div>';
    const safe = sanitizeRichTextMarkup(raw);
    expect(safe).toBe("<p>Alpha</p>Beta");
  });

  it("strips inline style on high-risk tags but keeps it on benign typography (SEC-10)", () => {
    const raw =
      '<a style="font-size:14px;color:red" href="/x">Link</a><span style="font-size:14px;color:red">Hi</span>';
    const safe = sanitizeRichTextMarkup(raw);
    expect(safe).toContain('href="/x"');
    expect(safe).not.toMatch(/<a[^>]*style=/);
    expect(safe).toContain('style="font-size:14px;color:red"');
  });

  it("strips inline style on table cells and blockquote (SEC-10 incremental)", () => {
    const raw =
      '<table><tr><th style="font-size:20px">H</th><td style="color:red">C</td></tr></table>' +
      '<blockquote style="font-size:18px">Q</blockquote>' +
      '<p style="opacity:0.9">P</p>';
    const safe = sanitizeRichTextMarkup(raw);
    expect(safe).not.toMatch(/<th[^>]*style=/);
    expect(safe).not.toMatch(/<td[^>]*style=/);
    expect(safe).not.toMatch(/<blockquote[^>]*style=/);
    expect(safe).toContain("<th>");
    expect(safe).toContain("<td>");
    expect(safe).toContain("<blockquote>");
    expect(safe).toContain('style="opacity:0.9"');
  });

  it("strips inline style on list items (SEC-10 incremental)", () => {
    const raw =
      '<ul><li style="font-size:20px;color:red">A</li></ul><span style="opacity:0.5">S</span>';
    const safe = sanitizeRichTextMarkup(raw);
    expect(safe).not.toMatch(/<li[^>]*style=/);
    expect(safe).toContain("<li>");
    expect(safe).toContain('style="opacity:0.5"');
  });

  it("strips inline style on code and pre (SEC-10 incremental)", () => {
    const raw =
      '<code style="font-size:12px;color:red">c</code><pre style="line-height:2">p</pre>' +
      '<span style="font-size:12px;color:blue">s</span>';
    const safe = sanitizeRichTextMarkup(raw);
    expect(safe).not.toMatch(/<code[^>]*style=/);
    expect(safe).not.toMatch(/<pre[^>]*style=/);
    expect(safe).toContain("<code>");
    expect(safe).toContain("<pre>");
    expect(safe).toContain('style="font-size:12px;color:blue"');
  });

  it("strips inline style on strong, em, and s (SEC-10 incremental)", () => {
    const raw =
      '<strong style="font-size:99px;color:red">B</strong>' +
      '<em style="opacity:0.1">I</em>' +
      '<s style="text-decoration:none;color:blue">S</s>' +
      '<span style="font-size:12px">ok</span>';
    const safe = sanitizeRichTextMarkup(raw);
    expect(safe).not.toMatch(/<strong\b[^>]*style=/);
    expect(safe).not.toMatch(/<em\b[^>]*style=/);
    expect(safe).not.toMatch(/<s\b[^>]*style=/);
    expect(safe).toContain("<strong>");
    expect(safe).toContain("<em>");
    expect(safe).toContain("<s>");
    expect(safe).toContain('style="font-size:12px"');
  });
});

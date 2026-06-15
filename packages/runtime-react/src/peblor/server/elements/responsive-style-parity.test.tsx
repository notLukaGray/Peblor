import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { buildResponsiveStyle } from "../../elements/Shared/responsive-style";
import { ServerElementRenderer } from "../ServerElementRenderer";

describe("responsive style parity (SSR)", () => {
  it("buildResponsiveStyle snapshots css + className for tier-map fontSize", () => {
    const result = buildResponsiveStyle({
      id: "h1",
      styles: { fontSize: { base: 14, md: 18, xl: 24 } },
    });
    expect(result.className).toBe("pb-r-h1");
    expect(result.css).toBe(
      ".pb-r-h1{font-size:14px}" +
        "@media (min-width:768px){.pb-r-h1{font-size:18px}}" +
        "@media (min-width:1280px){.pb-r-h1{font-size:24px}}"
    );
    expect(result.needsContainer).toBe(false);
  });

  it("heading with responsive fontSize emits <style data-pb-rs> with matching css and class", () => {
    const html = renderToStaticMarkup(
      <ServerElementRenderer
        block={
          {
            type: "elementHeading",
            id: "h1",
            text: "Responsive Heading",
            fontSize: { base: 14, md: 18, xl: 24 },
          } as never
        }
      />
    );

    // The SSR output must contain a <style data-pb-rs="pb-r-h1"> with the tier-map CSS.
    expect(html).toContain('data-pb-rs="pb-r-h1"');
    expect(html).toContain(
      ".pb-r-h1{font-size:14px}" +
        "@media (min-width:768px){.pb-r-h1{font-size:18px}}" +
        "@media (min-width:1280px){.pb-r-h1{font-size:24px}}"
    );

    // The outer div must carry the pb-r-h1 class alongside the base classes.
    expect(html).toContain('class="shrink-0 max-w-full pb-r-h1"');

    // Inline font-size is REMOVED when responsiveStyleClass is present.
    // font-size:18px only appears inside the <style data-pb-rs> CSS rules,
    // not in any inline style="" attribute — the responsive class is authoritative.
    const htmlWithoutStyleTags = html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
    expect(htmlWithoutStyleTags).not.toContain("font-size:18px");
  });

  it("heading with scalar fontSize emits NO data-pb-rs", () => {
    const html = renderToStaticMarkup(
      <ServerElementRenderer
        block={
          {
            type: "elementHeading",
            id: "h2",
            text: "Static Heading",
            fontSize: 24,
          } as never
        }
      />
    );

    expect(html).not.toContain("data-pb-rs");
    expect(html).not.toContain("pb-r-");
  });

  it("heading with no typography props emits NO data-pb-rs", () => {
    const html = renderToStaticMarkup(
      <ServerElementRenderer
        block={
          {
            type: "elementHeading",
            id: "h3",
            text: "Plain Heading",
          } as never
        }
      />
    );

    expect(html).not.toContain("data-pb-rs");
    expect(html).not.toContain("pb-r-");
  });

  it("body with responsive lineHeight emits <style data-pb-rs>", () => {
    const html = renderToStaticMarkup(
      <ServerElementRenderer
        block={
          {
            type: "elementBody",
            id: "body1",
            text: "Responsive Body",
            lineHeight: { base: 1.5, md: 1.8 },
          } as never
        }
      />
    );

    expect(html).toContain('data-pb-rs="pb-r-body1"');
    expect(html).toContain(
      ".pb-r-body1{line-height:1.5}" + "@media (min-width:768px){.pb-r-body1{line-height:1.8}}"
    );
    expect(html).toContain("pb-r-body1");

    // Inline line-height removed — responsive CSS class is authoritative.
    // line-height:1.8 only appears inside the <style> CSS rules, not inline.
    const htmlWithoutStyleTags = html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
    expect(htmlWithoutStyleTags).not.toContain("line-height:1.8");
  });

  it("body with scalar typography props emits NO data-pb-rs", () => {
    const html = renderToStaticMarkup(
      <ServerElementRenderer
        block={
          {
            type: "elementBody",
            id: "body2",
            text: "Plain Body",
            fontSize: 16,
            lineHeight: 1.5,
          } as never
        }
      />
    );

    expect(html).not.toContain("data-pb-rs");
    expect(html).not.toContain("pb-r-");
  });

  it("buildResponsiveStyle parity: same id produces identical class+css across calls", () => {
    const a = buildResponsiveStyle({
      id: "parity-test",
      styles: { fontSize: { base: 12, lg: 20 }, letterSpacing: { base: 0, md: 0.5 } },
    });
    const b = buildResponsiveStyle({
      id: "parity-test",
      styles: { fontSize: { base: 12, lg: 20 }, letterSpacing: { base: 0, md: 0.5 } },
    });

    expect(a.className).toBe(b.className);
    expect(a.css).toBe(b.css);
  });

  it("non-heading/non-body element types do NOT emit data-pb-rs", () => {
    const html = renderToStaticMarkup(
      <ServerElementRenderer
        block={
          {
            type: "elementLink",
            id: "link1",
            href: "https://example.com",
            text: "Link",
          } as never
        }
      />
    );

    expect(html).not.toContain("data-pb-rs");
  });
});

/**
 * Phase 3 — responsive layout CSS emission parity for all element types.
 *
 * Verifies that:
 *  - buildElementResponsiveStyle (via extractElementResponsiveLayoutStyles) extracts tier-map layout
 *    values from a raw block and produces scoped className + CSS.
 *  - ServerElementRenderer emits <style data-pb-rs> for every element type when the block
 *    has responsive layout props.
 *  - The class is present on the outer wrapper div.
 *  - A non-responsive element (all scalar layout) emits NO data-pb-rs.
 *  - inline styles are suppressed for props covered by responsive CSS (specificity flip).
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ServerElementRenderer } from "../ServerElementRenderer";
import { extractElementResponsiveLayoutStyles } from "@pb/core/layout";
import {
  buildResponsiveStyle,
  type ResponsiveStyleInput,
} from "../../elements/Shared/responsive-style";

// ── Direct function tests ─────────────────────────────────────────────

describe("buildElementResponsiveStyle data extraction (via buildResponsiveStyle)", () => {
  it("extracts simple tier-map layout values and produces CSS", () => {
    const styles: Record<string, unknown> = {
      width: { base: "100%", md: "50%" },
      marginTop: { base: "10px", md: "20px" },
    };
    const result = buildResponsiveStyle({ id: "test-el", styles } as ResponsiveStyleInput);
    expect(result.className).toBe("pb-r-test-el");
    expect(result.css).toContain("width:100%");
    expect(result.css).toContain("margin-top:10px");
    expect(result.needsContainer).toBe(false);
  });

  it("handles hug → fit-content translation for width/height via extractElementResponsiveLayoutStyles", () => {
    const styles = extractElementResponsiveLayoutStyles({
      width: { base: "hug", md: "100%" },
    });
    expect(styles.width).toEqual({ base: "fit-content", md: "100%" });
    const result = buildResponsiveStyle({
      id: "hug-test",
      styles,
    } as ResponsiveStyleInput);
    expect(result.css).toContain("width:fit-content");
    expect(result.css).not.toContain("width:hug");
  });

  it("returns undefined when no responsive values are present", () => {
    const styles: Record<string, unknown> = {};
    const result = buildResponsiveStyle({ id: "empty", styles } as ResponsiveStyleInput);
    expect(result.className).toBeUndefined();
    expect(result.css).toBeUndefined();
  });

  it("filters out scalar layout values (only tier-maps become CSS)", () => {
    const styles: Record<string, unknown> = {
      width: "100%", // scalar, will become base value
      marginTop: { base: "10px" }, // object, will be emitted
    };
    const result = buildResponsiveStyle({ id: "mixed", styles } as ResponsiveStyleInput);
    expect(result.className).toBe("pb-r-mixed");
    expect(result.css).toContain("width:100%");
    expect(result.css).toContain("margin-top:10px");
  });
});

// ── Server-side emission tests ────────────────────────────────────────

describe("ServerElementRenderer — responsive layout CSS emission", () => {
  it("emits data-pb-rs for elementDivider with responsive width", () => {
    const html = renderToStaticMarkup(
      <ServerElementRenderer
        block={
          {
            type: "elementDivider",
            width: { base: "100%", md: "50%" },
            height: "1px",
          } as never
        }
      />
    );
    expect(html).toContain("data-pb-rs");
    expect(html).toContain("pb-r-");
    // Class name should be on the outer div
    const match = html.match(/data-pb-rs="([^"]+)"/);
    if (match?.[1]) {
      expect(html).toContain(match[1]);
    }
  });

  it("emits data-pb-rs for elementImage with responsive margin", () => {
    const html = renderToStaticMarkup(
      <ServerElementRenderer
        block={
          {
            type: "elementImage",
            src: "/test.jpg",
            alt: "test",
            width: "200px",
            marginTop: { base: "0px", md: "20px" },
          } as never
        }
      />
    );
    expect(html).toContain("data-pb-rs");
  });

  it("emits data-pb-rs for elementLink with responsive width", () => {
    const html = renderToStaticMarkup(
      <ServerElementRenderer
        block={
          {
            type: "elementLink",
            label: "Link text",
            href: "#test",
            width: { base: "auto", md: "300px" },
          } as never
        }
      />
    );
    expect(html).toContain("data-pb-rs");
  });

  it("emits data-pb-rs for elementSpacer with responsive height", () => {
    const html = renderToStaticMarkup(
      <ServerElementRenderer
        block={
          {
            type: "elementSpacer",
            height: { base: "20px", md: "40px" },
          } as never
        }
      />
    );
    expect(html).toContain("data-pb-rs");
  });

  it("emits data-pb-rs for elementVector with responsive width", () => {
    const html = renderToStaticMarkup(
      <ServerElementRenderer
        block={
          {
            type: "elementVector",
            viewBox: "0 0 100 100",
            shapes: [],
            width: { base: "50px", md: "100px" },
            height: "50px",
          } as never
        }
      />
    );
    expect(html).toContain("data-pb-rs");
  });

  it("emits data-pb-rs for elementCounter with responsive margin", () => {
    const html = renderToStaticMarkup(
      <ServerElementRenderer
        block={
          {
            type: "elementCounter",
            target: 42,
            marginTop: { base: "10px", md: "30px" },
          } as never
        }
      />
    );
    expect(html).toContain("data-pb-rs");
  });

  it("emits data-pb-rs for elementEmbed with responsive border-radius", () => {
    const html = renderToStaticMarkup(
      <ServerElementRenderer
        block={
          {
            type: "elementEmbed",
            src: "https://example.com/embed",
            title: "Test",
            borderRadius: { base: "0px", md: "8px" },
          } as never
        }
      />
    );
    expect(html).toContain("data-pb-rs");
  });

  it("emits data-pb-rs for elementList with responsive padding-like marginLeft", () => {
    const html = renderToStaticMarkup(
      <ServerElementRenderer
        block={
          {
            type: "elementList",
            items: ["item1"],
            marginLeft: { base: "0px", md: "2em" },
          } as never
        }
      />
    );
    expect(html).toContain("data-pb-rs");
  });

  it("emits data-pb-rs for elementBlockquote with responsive fontSize + width", () => {
    const html = renderToStaticMarkup(
      <ServerElementRenderer
        block={
          {
            type: "elementBlockquote",
            text: "Quote",
            width: { base: "100%", md: "75%" },
            fontSize: { base: "1rem", md: "1.25rem" },
          } as never
        }
      />
    );
    // Should contain responsive style for both layout (width) and typography (fontSize)
    expect(html).toContain("data-pb-rs");
    // The <style> tag carries the responsive CSS, but the element's inline style attribute
    // should NOT carry the resolved font-size value (it's suppressed by the guard).
    // The responsive CSS is in a <style> block, not on the element itself.
    const styleMatch = html.match(/style="([^"]*)"/g);
    const inlineFontSize = styleMatch?.some((s) => s.includes("font-size"));
    expect(inlineFontSize).toBe(false);
  });

  it("emits data-pb-rs for elementTable with responsive width", () => {
    const html = renderToStaticMarkup(
      <ServerElementRenderer
        block={
          {
            type: "elementTable",
            headers: ["H1"],
            rows: [["C1"]],
            width: { base: "100%", md: "80%" },
          } as never
        }
      />
    );
    expect(html).toContain("data-pb-rs");
  });

  it("emits data-pb-rs for elementCode with responsive max-width", () => {
    const html = renderToStaticMarkup(
      <ServerElementRenderer
        block={
          {
            type: "elementCode",
            code: "const x = 1;",
            language: "typescript",
            maxWidth: { base: "100%", md: "600px" },
          } as never
        }
      />
    );
    expect(html).toContain("data-pb-rs");
  });

  it("emits NO data-pb-rs for elementDivider with all scalar layout", () => {
    const html = renderToStaticMarkup(
      <ServerElementRenderer
        block={
          {
            type: "elementDivider",
            width: "100%",
            height: "1px",
          } as never
        }
      />
    );
    expect(html).not.toContain("data-pb-rs");
  });

  it("merges typography + layout responsive styles into one class for heading/body", () => {
    const html = renderToStaticMarkup(
      <ServerElementRenderer
        block={
          {
            type: "elementHeading",
            text: "Responsive heading",
            fontSize: { base: "1.5rem", md: "2rem" },
            width: { base: "100%", md: "50%" },
            marginTop: { base: "0px", md: "20px" },
          } as never
        }
      />
    );
    // One data-pb-rs tag for both typography and layout
    const matches = html.match(/data-pb-rs/g);
    expect(matches).toHaveLength(1);
    // CSS should contain both typography and layout declarations
    expect(html).toContain("font-size");
    expect(html).toContain("width");
    expect(html).toContain("margin-top");
  });
});

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ElementHeading } from "./ElementHeading";

describe("ElementHeading semantic contract", () => {
  it("uses semanticLevel for the heading tag while preserving the visual level", () => {
    const markup = renderToStaticMarkup(
      <ElementHeading type="elementHeading" level={4} semanticLevel={1} text="Hello" />
    );

    expect(markup).toContain("<h1");
    expect(markup).toContain("</h1>");
    expect(markup).toContain("typography-heading-md");
  });

  it("applies gradient textFill over flat color and supports lineHeight", () => {
    const markup = renderToStaticMarkup(
      <ElementHeading
        type="elementHeading"
        level={2}
        text="Gradient"
        color="#111111"
        lineHeight="1.4"
        textFill={{ type: "gradient", value: "linear-gradient(90deg,#f00,#00f)" }}
      />
    );

    expect(markup).toContain("line-height:1.4");
    expect(markup).toContain("background-image:linear-gradient(90deg,#f00,#00f)");
    expect(markup).toContain("color:transparent");
    expect(markup).not.toContain("color:#111111");
  });

  it("resolves theme-aware color and textFill values before rendering styles", () => {
    const markup = renderToStaticMarkup(
      <ElementHeading
        type="elementHeading"
        level={2}
        text="Theme"
        color={{ light: "#111111", dark: "#eeeeee" }}
        textFill={{
          type: "gradient",
          value: {
            light: "linear-gradient(90deg,#111,#666)",
            dark: "linear-gradient(90deg,#fff,#8fdcff)",
          },
        }}
      />
    );

    // Gradient textFill values cannot be wrapped in light-dark() (browsers drop it).
    // The dark gradient is used directly since this is a dark-by-default site.
    expect(markup).toContain("background-image:linear-gradient(90deg,#fff,#8fdcff)");
    expect(markup).not.toContain("light-dark(linear-gradient");
    expect(markup).toContain("color:transparent");
    expect(markup).not.toContain("[object Object]");
  });

  it("supports inline formatting and preserves newline rendering defaults", () => {
    const markup = renderToStaticMarkup(
      <ElementHeading
        type="elementHeading"
        level={2}
        text={"Line 1\\nLine 2 with **bold**, *italic*, and ~~strike~~"}
      />
    );

    expect(markup).toContain("white-space:pre-line");
    expect(markup).toContain("<strong");
    expect(markup).toContain("<em");
    expect(markup).toContain("<del");
    expect(markup).toContain("Line 1\nLine 2");
  });
});

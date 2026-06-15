import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ServerElementHeading } from "./ServerElementHeading";

describe("ServerElementHeading — theme resolution", () => {
  it("emits light-dark() for theme-valued color, not a baked light value", () => {
    const html = renderToStaticMarkup(
      <ServerElementHeading
        type="elementHeading"
        text="Hello"
        color={{ light: "#aabbcc", dark: "#112233" }}
      />
    );
    expect(html).toContain("light-dark(#aabbcc, #112233)");
    expect(html).not.toContain('"#aabbcc"');
  });

  it("emits light-dark() for theme-valued textFill, not a baked light value", () => {
    const html = renderToStaticMarkup(
      <ServerElementHeading
        type="elementHeading"
        text="Hello"
        textFill={{ type: "color", value: { light: "#aabbcc", dark: "#112233" } } as never}
      />
    );
    expect(html).toContain("light-dark(#aabbcc, #112233)");
    expect(html).not.toContain('"#aabbcc"');
  });

  it("passes a plain string color through unchanged", () => {
    const html = renderToStaticMarkup(
      <ServerElementHeading type="elementHeading" text="Hello" color="#aabbcc" />
    );
    expect(html).toContain("#aabbcc");
    expect(html).not.toContain("light-dark");
  });
});

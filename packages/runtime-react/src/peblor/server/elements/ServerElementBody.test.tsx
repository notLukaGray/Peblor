import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ServerElementBody } from "./ServerElementBody";

describe("ServerElementBody — theme resolution", () => {
  it("emits light-dark() for theme-valued color, not a baked light value", () => {
    const html = renderToStaticMarkup(
      <ServerElementBody
        type="elementBody"
        text="Body text"
        color={{ light: "#aabbcc", dark: "#112233" }}
      />
    );
    expect(html).toContain("light-dark(#aabbcc, #112233)");
    expect(html).not.toContain('"#aabbcc"');
  });

  it("emits light-dark() for theme-valued textFill, not a baked light value", () => {
    const html = renderToStaticMarkup(
      <ServerElementBody
        type="elementBody"
        text="Body text"
        textFill={{ type: "color", value: { light: "#aabbcc", dark: "#112233" } } as never}
      />
    );
    expect(html).toContain("light-dark(#aabbcc, #112233)");
    expect(html).not.toContain('"#aabbcc"');
  });
});

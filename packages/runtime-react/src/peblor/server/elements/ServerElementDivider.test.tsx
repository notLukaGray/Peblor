import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ServerElementDivider } from "./ServerElementDivider";

describe("ServerElementDivider — theme resolution", () => {
  it("emits light-dark() for theme-valued color, not a baked light value", () => {
    const html = renderToStaticMarkup(
      <ServerElementDivider type="elementDivider" color={{ light: "#aabbcc", dark: "#112233" }} />
    );
    expect(html).toContain("light-dark(#aabbcc, #112233)");
    expect(html).not.toContain('"#aabbcc"');
  });

  it("passes a plain string color through unchanged", () => {
    const html = renderToStaticMarkup(
      <ServerElementDivider type="elementDivider" color="#aabbcc" />
    );
    expect(html).toContain("#aabbcc");
    expect(html).not.toContain("light-dark");
  });
});

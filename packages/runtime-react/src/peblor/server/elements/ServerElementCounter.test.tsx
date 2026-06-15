import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ServerElementCounter } from "./ServerElementCounter";

describe("ServerElementCounter — theme resolution", () => {
  it("emits light-dark() for theme-valued color, not a baked light value", () => {
    const html = renderToStaticMarkup(
      <ServerElementCounter
        type="elementCounter"
        target={42}
        trigger="onVisible"
        color={{ light: "#aabbcc", dark: "#112233" }}
      />
    );
    expect(html).toContain("light-dark(#aabbcc, #112233)");
    expect(html).not.toContain('"#aabbcc"');
  });

  it("emits light-dark() for theme-valued textFill color, not a baked light value", () => {
    const html = renderToStaticMarkup(
      <ServerElementCounter
        type="elementCounter"
        target={42}
        trigger="onVisible"
        textFill={{ type: "color", value: { light: "#aabbcc", dark: "#112233" } } as never}
      />
    );
    expect(html).toContain("light-dark(#aabbcc, #112233)");
    expect(html).not.toContain('"#aabbcc"');
  });
});

describe("ServerElementCounter — DOM structure (Phase 1)", () => {
  it("renders a div wrapper between figure and span to match client DOM", () => {
    const html = renderToStaticMarkup(
      <ServerElementCounter type="elementCounter" target={42} trigger="onVisible" />
    );
    // Client renders <figure><div ...><span>42</span></div></figure>
    // Server currently renders <figure><span>42</span></figure> — no div wrapper
    expect(html).toMatch(/<figure[^>]*><div[^>]*><span[^>]*>42<\/span><\/div><\/figure>/);
  });
});

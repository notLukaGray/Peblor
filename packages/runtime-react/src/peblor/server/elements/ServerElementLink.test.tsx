import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ServerElementLink } from "./ServerElementLink";

const BASE_LINK = {
  type: "elementLink" as const,
  label: "Click me",
  href: "/",
  copyType: "body" as const,
};

describe("ServerElementLink — theme resolution", () => {
  it("emits light-dark() for theme-valued linkDefault color", () => {
    const html = renderToStaticMarkup(
      <ServerElementLink {...BASE_LINK} linkDefault={{ light: "#aabbcc", dark: "#112233" }} />
    );
    expect(html).toContain("light-dark(#aabbcc, #112233)");
    expect(html).not.toContain('"#aabbcc"');
  });

  it("emits light-dark() for theme-valued linkHover color", () => {
    const html = renderToStaticMarkup(
      <ServerElementLink {...BASE_LINK} linkHover={{ light: "#aabbcc", dark: "#112233" }} />
    );
    expect(html).toContain("light-dark(#aabbcc, #112233)");
    expect(html).not.toContain('"#aabbcc"');
  });

  it("emits light-dark() for theme-valued linkActive color", () => {
    const html = renderToStaticMarkup(
      <ServerElementLink {...BASE_LINK} linkActive={{ light: "#aabbcc", dark: "#112233" }} />
    );
    expect(html).toContain("light-dark(#aabbcc, #112233)");
    expect(html).not.toContain('"#aabbcc"');
  });

  it("emits light-dark() for theme-valued linkDisabled color", () => {
    const html = renderToStaticMarkup(
      <ServerElementLink {...BASE_LINK} linkDisabled={{ light: "#aabbcc", dark: "#112233" }} />
    );
    expect(html).toContain("light-dark(#aabbcc, #112233)");
    expect(html).not.toContain('"#aabbcc"');
  });
});

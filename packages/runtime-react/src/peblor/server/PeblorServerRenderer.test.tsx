import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PeblorServerRenderer } from "./PeblorServerRenderer";

describe("PeblorServerRenderer backgroundVariable", () => {
  it("renders static themed fills with css-native light/dark output", () => {
    const markup = renderToStaticMarkup(
      <PeblorServerRenderer
        resolvedBg={{
          type: "backgroundVariable",
          layers: [{ fill: { light: "#fff", dark: "#000" } }],
        }}
        resolvedSections={[]}
      />
    );

    expect(markup).toContain("light-dark(#fff, #000)");
    expect(markup).toContain("[color-scheme:light] dark:[color-scheme:dark]");
    expect(markup).toContain('data-pb-server-renderer="static"');
  });
});

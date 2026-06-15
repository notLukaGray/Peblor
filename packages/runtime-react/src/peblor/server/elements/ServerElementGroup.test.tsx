import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ServerElementGroup } from "./ServerElementGroup";

describe("ServerElementGroup — theme resolution", () => {
  it("emits light-dark() for theme-valued wrapperStyle property, not a baked light value", () => {
    const html = renderToStaticMarkup(
      <ServerElementGroup
        type="elementGroup"
        section={{ elementOrder: [], definitions: {} } as never}
        wrapperStyle={{ background: { light: "#aabbcc", dark: "#112233" } } as never}
      />
    );
    expect(html).toContain("light-dark(#aabbcc, #112233)");
    expect(html).not.toContain('"#aabbcc"');
  });
});

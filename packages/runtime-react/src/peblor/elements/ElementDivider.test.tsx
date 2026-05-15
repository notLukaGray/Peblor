import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ServerBreakpointProvider } from "@pb/runtime-react/core/providers/device-type-provider";
import { ElementDivider } from "./ElementDivider";

describe("ElementDivider", () => {
  it("renders a horizontal divider with solid fill", () => {
    const markup = renderToStaticMarkup(
      <ServerBreakpointProvider isMobile={false}>
        <ElementDivider
          type="elementDivider"
          orientation="horizontal"
          thickness="2px"
          color="#ff0000"
          length="80%"
        />
      </ServerBreakpointProvider>
    );
    expect(markup).toContain("width:80%");
    expect(markup).toContain("height:2px");
    expect(markup).toContain("background-color:#ff0000");
  });

  it("renders a vertical divider with dotted border", () => {
    const markup = renderToStaticMarkup(
      <ServerBreakpointProvider isMobile={false}>
        <ElementDivider
          type="elementDivider"
          orientation="vertical"
          style="dotted"
          thickness="3px"
          color="#00ff00"
          length="40px"
        />
      </ServerBreakpointProvider>
    );
    expect(markup).toContain("height:40px");
    expect(markup).toContain("border-left:3px dotted #00ff00");
  });

  it("resolves theme-aware divider color", () => {
    const markup = renderToStaticMarkup(
      <ServerBreakpointProvider isMobile={false}>
        <ElementDivider
          type="elementDivider"
          orientation="horizontal"
          thickness="2px"
          color={{ light: "#111111", dark: "#eeeeee" }}
          length="80%"
        />
      </ServerBreakpointProvider>
    );
    expect(markup).toContain("background-color:#eeeeee");
    expect(markup).not.toContain("[object Object]");
  });
});

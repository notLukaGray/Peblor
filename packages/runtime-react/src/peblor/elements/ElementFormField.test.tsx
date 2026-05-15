import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ServerBreakpointProvider } from "@pb/runtime-react/core/providers/device-type-provider";
import { ElementFormField } from "./ElementFormField";

describe("ElementFormField standalone mobile layout", () => {
  it("uses the field responsive width as the outer element width on mobile", () => {
    const markup = renderToStaticMarkup(
      <ServerBreakpointProvider isMobile>
        <ElementFormField
          type="elementFormField"
          field={{
            type: "formField",
            fieldType: "text",
            label: "Name",
            name: "name",
            width: ["100%", "20rem"],
          }}
        />
      </ServerBreakpointProvider>
    );

    expect(markup).toContain("width:100%");
    expect(markup).toContain('name="name"');
  });
});

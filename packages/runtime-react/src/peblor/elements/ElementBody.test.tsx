import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ElementBody } from "./ElementBody";

describe("ElementBody inline formatting", () => {
  it("supports inline formatting and preserves newline rendering defaults", () => {
    const markup = renderToStaticMarkup(
      <ElementBody
        type="elementBody"
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

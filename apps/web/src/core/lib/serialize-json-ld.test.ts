import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "./serialize-json-ld";

describe("serializeJsonLd", () => {
  it("escapes less-than to prevent script breakouts", () => {
    const htmlLike = { text: "</script><script>alert(1)</script>" };
    const serialized = serializeJsonLd(htmlLike);
    expect(serialized).toContain("\\u003c/script>");
    expect(serialized).not.toContain("</script>");
  });
});

import { describe, expect, it } from "vitest";
import { parseAnnotations, parseNodeAnnotations } from "./annotations-parse";

describe("parseAnnotations", () => {
  it("merges multiple [pb:] blocks left-to-right with later keys winning", () => {
    const name = "L1 [pb: a=1] mid [pb: b=2, a=override]";
    expect(parseAnnotations(name)).toEqual({ a: "override", b: "2" });
  });

  it("treats bare keys as true flags", () => {
    expect(parseAnnotations("Layer [pb: sticky, delay=200]")).toEqual({
      sticky: "true",
      delay: "200",
    });
  });
});

describe("parseNodeAnnotations", () => {
  it("merges name annotations with structured figma annotation labels", () => {
    const merged = parseNodeAnnotations({
      name: "S [pb: sticky=true]",
      annotations: [{ label: "[pb: delay=100]" }],
    } as unknown as { name?: string } & Record<string, unknown>);
    expect(merged.sticky).toBe("true");
    expect(merged.delay).toBe("100");
  });

  it("reads labelMarkdown when label is absent", () => {
    const merged = parseNodeAnnotations({
      name: "X",
      annotations: [{ labelMarkdown: "[pb: onvisible=show:hero]" }],
    } as unknown as { name?: string } & Record<string, unknown>);
    expect(merged.onvisible).toBe("show:hero");
  });
});

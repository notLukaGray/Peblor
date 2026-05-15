import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PeblorRenderer } from "@/peblor/PeblorRenderer";

describe("peblor renderer strictness", () => {
  it("throws when a fixture page contains an unknown element type", () => {
    const fixtureSections = [
      {
        type: "contentBlock",
        elements: [{ type: "elementBogus", id: "bogus-1" }],
      },
    ];

    expect(() =>
      renderToStaticMarkup(
        <PeblorRenderer
          resolvedBg={null}
          resolvedSections={fixtureSections as never}
          serverIsMobile={false}
        />
      )
    ).toThrow('unknown element type: "elementBogus"');
  });

  it("throws when a page contains an unknown section type", () => {
    const fixtureSections = [{ type: "sectionBogus" }];

    expect(() =>
      renderToStaticMarkup(
        <PeblorRenderer
          resolvedBg={null}
          resolvedSections={fixtureSections as never}
          serverIsMobile={false}
        />
      )
    ).toThrow('unknown section type: "sectionBogus"');
  });
});

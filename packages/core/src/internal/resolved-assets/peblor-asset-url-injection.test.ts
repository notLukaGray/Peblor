import { describe, expect, it } from "vitest";
import type { SectionBlock } from "@pb/contracts";
import { injectResolvedUrlsIntoPage } from "./peblor-asset-url-injection";

describe("injectResolvedUrlsIntoPage", () => {
  it("produces identical output when called twice on the same sections array", () => {
    const sections: SectionBlock[] = [
      {
        type: "contentBlock",
        elements: [
          {
            type: "elementGroup",
            id: "group",
            section: {
              definitions: {
                child: { type: "elementImage", image: "work/a.jpg" },
              },
            },
            moduleConfig: {
              type: "module",
              slots: {
                hero: {
                  section: {
                    definitions: {
                      video: {
                        type: "elementVideo",
                        sources: [{ src: "work/video.mp4" }],
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      } as unknown as SectionBlock,
    ];

    const urlMap = new Map<string, string | null>([
      ["work/a.jpg", "https://cdn.example/work/a.jpg"],
      ["work/video.mp4", "https://cdn.example/work/video.mp4"],
    ]);

    const { resolvedSections: first } = injectResolvedUrlsIntoPage(null, sections, urlMap);
    const { resolvedSections: second } = injectResolvedUrlsIntoPage(null, sections, urlMap);

    expect(second).toEqual(first);
  });
});

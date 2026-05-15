import { describe, expect, it } from "vitest";
import { collectInitialPageResourceHints } from "./page-resource-hints";

describe("collectInitialPageResourceHints", () => {
  it("collects image hints from elementImage", () => {
    const hints = collectInitialPageResourceHints({
      resolvedSections: [
        { type: "contentBlock", elements: [{ type: "elementImage", src: "/img/hero.webp" }] },
      ],
    });
    expect(hints.length).toBeGreaterThan(0);
    expect(hints[0]?.url).toBe("/img/hero.webp");
  });

  it("collects poster from elementVideo", () => {
    const hints = collectInitialPageResourceHints({
      resolvedSections: [
        {
          type: "contentBlock",
          elements: [
            { type: "elementVideo", src: "/videos/test.mp4", poster: "/videos/poster.jpg" },
          ],
        },
      ],
    });
    const posterHint = hints.find((h) => h.url === "/videos/poster.jpg");
    expect(posterHint).toBeDefined();
    expect(posterHint?.as).toBe("image");
  });

  it("does not emit video preload hints", () => {
    const hints = collectInitialPageResourceHints({
      resolvedSections: [
        {
          type: "contentBlock",
          elements: [
            {
              type: "elementVideo",
              src: "/videos/test.mp4",
              poster: "/videos/poster.jpg",
              priority: true,
            },
          ],
        },
      ],
    });
    expect(hints.some((h) => h.url === "/videos/test.mp4")).toBe(false);
  });

  it("skips media from hidden sections", () => {
    const hints = collectInitialPageResourceHints({
      resolvedSections: [
        {
          type: "contentBlock",
          hidden: true,
          elements: [{ type: "elementImage", src: "/img/hidden.webp" }],
        },
      ],
    });
    expect(hints).toHaveLength(0);
  });

  it("skips media from sections with visibleWhen", () => {
    const hints = collectInitialPageResourceHints({
      resolvedSections: [
        {
          type: "contentBlock",
          visibleWhen: { variable: "showHero", operator: "equals", value: true },
          elements: [{ type: "elementImage", src: "/img/conditional.webp" }],
        },
      ],
    });
    expect(hints).toHaveLength(0);
  });

  it("walks only collapsed elements for unrevealed revealSection", () => {
    const hints = collectInitialPageResourceHints({
      resolvedSections: [
        {
          type: "revealSection",
          initialRevealed: false,
          collapsedElements: [{ type: "elementImage", src: "/img/visible.webp" }],
          revealedElements: [{ type: "elementImage", src: "/img/hidden-until-reveal.webp" }],
        },
      ],
    });
    const visible = hints.find((h) => h.url === "/img/visible.webp");
    const hidden = hints.find((h) => h.url === "/img/hidden-until-reveal.webp");
    expect(visible).toBeDefined();
    expect(hidden).toBeUndefined();
  });

  it("walks both branches for initially-revealed revealSection", () => {
    const hints = collectInitialPageResourceHints({
      resolvedSections: [
        {
          type: "revealSection",
          initialRevealed: true,
          collapsedElements: [{ type: "elementImage", src: "/img/collapsed.webp" }],
          revealedElements: [{ type: "elementImage", src: "/img/revealed.webp" }],
        },
      ],
    });
    const collapsed = hints.find((h) => h.url === "/img/collapsed.webp");
    const revealed = hints.find((h) => h.url === "/img/revealed.webp");
    expect(collapsed).toBeDefined();
    expect(revealed).toBeDefined();
  });

  it("respects maxHints limit", () => {
    const hints = collectInitialPageResourceHints({
      maxHints: 1,
      resolvedSections: [
        {
          type: "contentBlock",
          elements: [
            { type: "elementImage", src: "/img/1.webp" },
            { type: "elementImage", src: "/img/2.webp" },
          ],
        },
      ],
    });
    expect(hints).toHaveLength(1);
  });

  it("collects background image hints with high priority", () => {
    const hints = collectInitialPageResourceHints({
      resolvedBg: { type: "backgroundImage", image: "/bg/hero.webp" },
    });
    const bgHint = hints.find((h) => h.url === "/bg/hero.webp");
    expect(bgHint).toBeDefined();
    expect(bgHint?.fetchPriority).toBe("high");
  });

  it("skips hidden background elements", () => {
    const hints = collectInitialPageResourceHints({
      resolvedBg: { type: "backgroundImage", image: "/bg/hero.webp", hidden: true },
    });
    expect(hints).toHaveLength(0);
  });

  it("skips overlay sections with visibleWhen", () => {
    const hints = collectInitialPageResourceHints({
      overlaySections: [
        {
          type: "contentBlock",
          visibleWhen: { variable: "showOverlay", operator: "equals", value: true },
          elements: [{ type: "elementImage", src: "/img/overlay.webp" }],
        },
      ],
    });
    expect(hints).toHaveLength(0);
  });
});

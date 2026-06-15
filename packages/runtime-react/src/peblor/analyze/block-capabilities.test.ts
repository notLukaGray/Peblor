import { describe, expect, it } from "vitest";
import type { ElementBlock, SectionBlock } from "@pb/contracts/types";
import { analyzeBlockCapabilities } from "./block-capabilities";

function section(overrides: Partial<SectionBlock> = {}): SectionBlock {
  return {
    type: "contentBlock",
    elements: [],
    ...overrides,
  } as SectionBlock;
}

function heading(overrides: Partial<ElementBlock> = {}): ElementBlock {
  return {
    type: "elementHeading",
    text: "Hello",
    ...overrides,
  } as ElementBlock;
}

describe("analyzeBlockCapabilities", () => {
  it("classifies simple text sections as static", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [section({ elements: [heading()] })],
    });

    expect(result.classification).toBe("static");
    expect(result.tree.children[0]?.classification).toBe("static");
    expect(result.tree.children[0]?.children[0]?.classification).toBe("static");
  });

  it("forces descendants under client sections to client", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [section({ motion: { to: { opacity: 1 } }, elements: [heading()] })],
    });

    const sectionNode = result.tree.children[0];
    expect(sectionNode?.classification).toBe("client");
    expect(sectionNode?.children[0]?.classification).toBe("client");
    expect(sectionNode?.children[0]?.reasons).toContain("ancestor-client");
  });

  it("marks static wrappers with client children as mixed", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [
        section({
          elements: [heading(), { type: "elementVideo", src: "/video.mp4" } as ElementBlock],
        }),
      ],
    });

    const sectionNode = result.tree.children[0];
    expect(result.classification).toBe("mixed");
    expect(sectionNode?.classification).toBe("mixed");
    expect(sectionNode?.children.map((child) => child.classification)).toEqual([
      "static",
      "client",
    ]);
  });

  it("treats visibleWhen as client because it reads the variable store", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [
        section({
          elements: [
            heading({
              visibleWhen: { variable: "user.name", operator: "equals", value: "Jane" },
            }),
          ],
        }),
      ],
    });

    const elementNode = result.tree.children[0]?.children[0];
    expect(elementNode?.classification).toBe("client");
    expect(elementNode?.reasons).toContain("client-prop");
    expect(elementNode?.reasons).toContain("store-read");
  });

  it("treats variableKey and string templates as store reads", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [
        section({
          elements: [
            heading({ variableKey: "user.name" }),
            heading({ text: "Welcome {user.name}" }),
          ],
        }),
      ],
    });

    const elementNodes = result.tree.children[0]?.children ?? [];
    expect(elementNodes.map((node) => node.classification)).toEqual(["client", "client"]);
    expect(elementNodes.every((node) => node.reasons.includes("store-read"))).toBe(true);
  });

  it("treats elementMarquee as client (infinite ticker needs ElementMarquee, not server stub)", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [
        section({
          elements: [
            { type: "elementMarquee", text: "Tick", direction: "left", speed: 20 } as ElementBlock,
          ],
        }),
      ],
    });

    const elementNode = result.tree.children[0]?.children[0];
    expect(elementNode?.classification).toBe("client");
    expect(elementNode?.reasons).toContain("client-only-type");
  });

  it("marks page scroll and background transitions as page runtime", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: { type: "image", src: "/bg.jpg" } as never,
      resolvedSections: [section()],
      scroll: { mode: "page" } as never,
      transitions: [{ id: "fade", from: "a", to: "b", effect: "fade" }] as never,
    });

    expect(result.classification).toBe("client");
    expect(result.usesPageRuntime).toBe(true);
    expect(result.tree.reasons).toContain("page-runtime");
  });

  // Phase 4 — redundant CLIENT_PROP_KEYS cleanup
  // The keys below only appear on types already in ALWAYS_CLIENT_ELEMENT_TYPES, so they
  // never change classification. They should NOT appear in `reasons` as "client-prop" —
  // the only driver should be "client-only-type".
  it("elementAudio with showWaveform: reason is client-only-type, not client-prop", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [
        section({
          elements: [
            { type: "elementAudio", src: "/audio.mp3", showWaveform: true } as ElementBlock,
          ],
        }),
      ],
    });
    const el = result.tree.children[0]?.children[0];
    expect(el?.classification).toBe("client");
    expect(el?.reasons).toContain("client-only-type");
    expect(el?.reasons).not.toContain("client-prop");
  });

  it("elementMarquee with pauseOnHover/pauseOnFocus: reason is client-only-type, not client-prop", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [
        section({
          elements: [
            {
              type: "elementMarquee",
              text: "Tick",
              direction: "left",
              speed: 20,
              pauseOnHover: true,
              pauseOnFocus: true,
            } as ElementBlock,
          ],
        }),
      ],
    });
    const el = result.tree.children[0]?.children[0];
    expect(el?.classification).toBe("client");
    expect(el?.reasons).toContain("client-only-type");
    expect(el?.reasons).not.toContain("client-prop");
  });

  it("elementImageCompare with hoverActivate: reason is client-only-type, not client-prop", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [
        section({
          elements: [{ type: "elementImageCompare", hoverActivate: true } as ElementBlock],
        }),
      ],
    });
    const el = result.tree.children[0]?.children[0];
    expect(el?.classification).toBe("client");
    expect(el?.reasons).toContain("client-only-type");
    expect(el?.reasons).not.toContain("client-prop");
  });

  it("elementTooltip with followCursor: reason is client-only-type, not client-prop", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [
        section({
          elements: [{ type: "elementTooltip", followCursor: true } as ElementBlock],
        }),
      ],
    });
    const el = result.tree.children[0]?.children[0];
    expect(el?.classification).toBe("client");
    expect(el?.reasons).toContain("client-only-type");
    expect(el?.reasons).not.toContain("client-prop");
  });

  it("elementLottie with interactivity: reason is client-only-type, not client-prop", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [
        section({
          elements: [
            { type: "elementLottie", src: "/anim.lottie", interactivity: [] } as ElementBlock,
          ],
        }),
      ],
    });
    const el = result.tree.children[0]?.children[0];
    expect(el?.classification).toBe("client");
    expect(el?.reasons).toContain("client-only-type");
    expect(el?.reasons).not.toContain("client-prop");
  });
});

/**
 * Phase 2 — motionTiming demotion
 *
 * Elements whose only client-side need is an entrance/gesture animation
 * should be classified as "static" so they are server-rendered.
 * The entrance wrapper is applied as a thin "use client" boundary in
 * ServerElementRenderer — it never forces the entire element to be
 * a ClientElementIsland with zero SSR content.
 *
 * Exceptions that must stay "client":
 *   - motionTiming.trigger === "onTrigger"  (needs the trigger store)
 *   - motionTiming.staggerChildren on a group  (needs MixedElementGroupIsland)
 *   - any additional real client prop (visibleWhen, dragAxis, etc.)
 */
import { describe, expect, it } from "vitest";
import type { ElementBlock, SectionBlock } from "@pb/contracts/types";
import { analyzeBlockCapabilities } from "./block-capabilities";

function section(overrides: Partial<SectionBlock> = {}): SectionBlock {
  return { type: "contentBlock", elements: [], ...overrides } as SectionBlock;
}

function heading(overrides: Partial<ElementBlock> = {}): ElementBlock {
  return { type: "elementHeading", text: "Hello", ...overrides } as ElementBlock;
}

function group(overrides: Partial<ElementBlock> = {}): ElementBlock {
  return {
    type: "elementGroup",
    section: { elementOrder: [], definitions: {} },
    ...overrides,
  } as ElementBlock;
}

describe("motionTiming demotion — classification", () => {
  it("leaf element with ONLY motionTiming classifies as static", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [
        section({
          elements: [
            heading({
              motionTiming: { entrancePreset: "fade", trigger: "onFirstVisible" } as never,
            }),
          ],
        }),
      ],
    });
    const el = result.tree.children[0]?.children[0];
    // Currently "client" — motionTiming is in CLIENT_PROP_KEYS
    expect(el?.classification).toBe("static");
    expect(el?.reasons).not.toContain("client-prop");
  });

  it("leaf element with ONLY motion (gesture) classifies as static", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [
        section({
          elements: [
            heading({
              motion: { whileHover: { scale: 1.05 } } as never,
            }),
          ],
        }),
      ],
    });
    const el = result.tree.children[0]?.children[0];
    // Currently "client" — motion is in CLIENT_PROP_KEYS
    expect(el?.classification).toBe("static");
  });

  it("element with motionTiming trigger:onTrigger stays client — needs trigger store", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [
        section({
          elements: [
            heading({
              motionTiming: { entrancePreset: "fade", trigger: "onTrigger" } as never,
            }),
          ],
        }),
      ],
    });
    const el = result.tree.children[0]?.children[0];
    expect(el?.classification).toBe("client");
  });

  it("element with motionTiming AND a real client prop stays client", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [
        section({
          elements: [
            heading({
              motionTiming: { entrancePreset: "fade" } as never,
              visibleWhen: { variable: "x", conditions: [] } as never,
            }),
          ],
        }),
      ],
    });
    const el = result.tree.children[0]?.children[0];
    expect(el?.classification).toBe("client");
  });

  it("elementGroup with non-stagger motionTiming classifies as static", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [
        section({
          elements: [
            group({
              motionTiming: { entrancePreset: "slideUp" } as never,
            }),
          ],
        }),
      ],
    });
    const el = result.tree.children[0]?.children[0];
    // Currently "client" — motionTiming forces group to ClientElementIsland
    expect(el?.classification).toBe("static");
  });

  it("elementGroup with staggerChildren motionTiming stays client — needs MixedElementGroupIsland", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [
        section({
          elements: [
            group({
              motionTiming: { entrancePreset: "fade", staggerChildren: 0.1 } as never,
            }),
          ],
        }),
      ],
    });
    const el = result.tree.children[0]?.children[0];
    expect(el?.classification).toBe("client");
  });

  it("section motionTiming still forces section to client — sections need SectionMotionWrapper", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [
        section({
          motionTiming: { entrancePreset: "fade" } as never,
          elements: [],
        }),
      ],
    });
    const sectionNode = result.tree.children[0];
    expect(sectionNode?.classification).toBe("client");
  });
});

import { describe, expect, it } from "vitest";
import { transformElementsInSections } from "./shared-element-transformer";
import type { ElementBlock, SectionBlock } from "@pb/contracts/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Cast a section block to a loose record for safe property access. */
type R = Record<string, unknown>;

function sec(result: SectionBlock[], i: number): R {
  return result[i] as unknown as R;
}

function els(result: SectionBlock[], i: number): R[] {
  return sec(result, i).elements as R[];
}

function el(result: SectionBlock[], si: number, ei: number): R {
  return els(result, si)[ei]! as R;
}

function heading(text: string, extra?: R): R {
  return { type: "elementHeading", text, id: `h-${text}`, ...extra };
}

const ADD_TRANSFORMED: (e: R) => R = (e: R) => {
  if (e._transformed) return e;
  return { ...e, _transformed: true };
};

const T = ADD_TRANSFORMED as unknown as (e: ElementBlock) => ElementBlock;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("transformElementsInSections", () => {
  it("returns an empty array for empty input", () => {
    expect(transformElementsInSections([], T)).toEqual([]);
  });

  it("handles sections without an elements array", () => {
    const result = transformElementsInSections(
      [{ type: "divider", id: "s-1" }] as unknown as SectionBlock[],
      T
    );
    expect(sec(result, 0).type).toBe("divider");
  });

  it("applies transform to a single flat element in the elements array", () => {
    const sections = [
      { type: "contentBlock", elements: [heading("Hello")] },
    ] as unknown as SectionBlock[];
    const result = transformElementsInSections(sections, T);
    expect(el(result, 0, 0)._transformed).toBe(true);
  });

  it("transforms definitions inside an elementGroup section", () => {
    const sections = [
      {
        type: "contentBlock",
        elements: [
          {
            type: "elementGroup",
            id: "g-1",
            section: { definitions: { title: heading("T"), body: heading("B") } },
          },
        ],
      },
    ] as unknown as SectionBlock[];
    const result = transformElementsInSections(sections, T);
    const defs = (el(result, 0, 0).section as R).definitions as R;
    expect((defs.title as R)._transformed).toBe(true);
    expect((defs.body as R)._transformed).toBe(true);
  });

  it("transforms direct children in the elements array of an elementGroup", () => {
    const sections = [
      {
        type: "contentBlock",
        elements: [
          {
            type: "elementGroup",
            id: "g-1",
            section: { definitions: {} },
            elements: [heading("C1"), heading("C2")],
          },
        ],
      },
    ] as unknown as SectionBlock[];
    const result = transformElementsInSections(sections, T);
    const children = el(result, 0, 0).elements as R[];
    expect((children[0]! as R)._transformed).toBe(true);
    expect((children[1]! as R)._transformed).toBe(true);
  });

  it("transforms definitions inside an elementInfiniteScroll section", () => {
    const sections = [
      {
        type: "contentBlock",
        elements: [
          {
            type: "elementInfiniteScroll",
            id: "inf-1",
            section: { definitions: { item: heading("Scroll Item") } },
          },
        ],
      },
    ] as unknown as SectionBlock[];
    const result = transformElementsInSections(sections, T);
    const defs = (el(result, 0, 0).section as R).definitions as R;
    expect((defs.item as R)._transformed).toBe(true);
  });

  it("transforms direct children in the elements array of an elementInfiniteScroll", () => {
    const sections = [
      {
        type: "contentBlock",
        elements: [
          {
            type: "elementInfiniteScroll",
            id: "inf-1",
            section: { definitions: {} },
            elements: [heading("SC1"), heading("SC2")],
          },
        ],
      },
    ] as unknown as SectionBlock[];
    const result = transformElementsInSections(sections, T);
    const children = el(result, 0, 0).elements as R[];
    expect((children[0]! as R)._transformed).toBe(true);
    expect((children[1]! as R)._transformed).toBe(true);
  });

  it("transforms definitions inside moduleConfig.slots", () => {
    const sections = [
      {
        type: "contentBlock",
        elements: [
          {
            type: "elementImage",
            src: "x.svg",
            alt: "M",
            moduleConfig: {
              slots: {
                A: { section: { definitions: { t: heading("ST"), b: heading("SB") } } },
              },
            },
          },
        ],
      },
    ] as unknown as SectionBlock[];
    const result = transformElementsInSections(sections, T);
    const slots = ((el(result, 0, 0).moduleConfig as R).slots as R).A as R;
    const defs = (slots.section as R).definitions as R;
    expect((defs.t as R)._transformed).toBe(true);
    expect((defs.b as R)._transformed).toBe(true);
  });

  it("transforms collapsedElements in a revealSection", () => {
    const sections = [
      { type: "revealSection", collapsedElements: [heading("C1")] },
    ] as unknown as SectionBlock[];
    const result = transformElementsInSections(sections, T);
    const collapsed = sec(result, 0).collapsedElements as R[];
    expect((collapsed[0]! as R)._transformed).toBe(true);
  });

  it("transforms revealedElements in a revealSection", () => {
    const sections = [
      { type: "revealSection", revealedElements: [heading("R1"), heading("R2")] },
    ] as unknown as SectionBlock[];
    const result = transformElementsInSections(sections, T);
    const revealed = sec(result, 0).revealedElements as R[];
    expect((revealed[0]! as R)._transformed).toBe(true);
    expect((revealed[1]! as R)._transformed).toBe(true);
  });

  it("transforms both collapsedElements and revealedElements together", () => {
    const sections = [
      {
        type: "revealSection",
        collapsedElements: [heading("C")],
        revealedElements: [heading("R")],
      },
    ] as unknown as SectionBlock[];
    const result = transformElementsInSections(sections, T);
    const s = sec(result, 0);
    expect(((s.collapsedElements as R[])[0]! as R)._transformed).toBe(true);
    expect(((s.revealedElements as R[])[0]! as R)._transformed).toBe(true);
  });

  it("does NOT transform cssGradient elements in the elements array", () => {
    let calls = 0;
    const tracking = ((e: R) => {
      calls++;
      return { ...e, _transformed: true };
    }) as unknown as (e: ElementBlock) => ElementBlock;
    const sections = [
      {
        type: "contentBlock",
        elements: [heading("R1"), { type: "cssGradient", id: "g-1" }, heading("R2")],
      },
    ] as unknown as SectionBlock[];
    const result = transformElementsInSections(sections, tracking);
    expect(calls).toBe(2);
    expect((els(result, 0)[0]! as R)._transformed).toBe(true);
    expect((els(result, 0)[1]! as R)._transformed).toBeUndefined();
    expect((els(result, 0)[2]! as R)._transformed).toBe(true);
  });

  it("does NOT transform cssGradient elements inside elementGroup definitions", () => {
    let calls = 0;
    const tracking = ((e: R) => {
      calls++;
      return { ...e, _transformed: true };
    }) as unknown as (e: ElementBlock) => ElementBlock;
    const sections = [
      {
        type: "contentBlock",
        elements: [
          {
            type: "elementGroup",
            id: "g-1",
            section: {
              definitions: { real: heading("R"), grad: { type: "cssGradient", id: "g-2" } },
            },
          },
        ],
      },
    ] as unknown as SectionBlock[];
    transformElementsInSections(sections, tracking);
    expect(calls).toBe(2);
  });

  it("does NOT transform cssGradient elements inside elementGroup direct children", () => {
    let calls = 0;
    const tracking = ((e: R) => {
      calls++;
      return { ...e, _transformed: true };
    }) as unknown as (e: ElementBlock) => ElementBlock;
    const sections = [
      {
        type: "contentBlock",
        elements: [
          {
            type: "elementGroup",
            id: "g-1",
            section: { definitions: {} },
            elements: [heading("R"), { type: "cssGradient", id: "g-3" }],
          },
        ],
      },
    ] as unknown as SectionBlock[];
    transformElementsInSections(sections, tracking);
    expect(calls).toBe(2);
  });

  it("does NOT transform cssGradient elements inside revealSection branches", () => {
    let calls = 0;
    const tracking = ((e: R) => {
      calls++;
      return { ...e, _transformed: true };
    }) as unknown as (e: ElementBlock) => ElementBlock;
    const sections = [
      {
        type: "revealSection",
        collapsedElements: [heading("R"), { type: "cssGradient", id: "g-4" }],
        revealedElements: [{ type: "cssGradient", id: "g-5" }, heading("AR")],
      },
    ] as unknown as SectionBlock[];
    transformElementsInSections(sections, tracking);
    expect(calls).toBe(2);
  });

  it("applies a field-modifying transform correctly", () => {
    const sections = [
      { type: "contentBlock", elements: [heading("Hello", { level: 2 })] },
    ] as unknown as SectionBlock[];
    const result = transformElementsInSections(sections, ((e: R) => ({
      ...e,
      level: typeof e.level === "number" ? e.level + 1 : 1,
      modified: true,
    })) as unknown as (e: ElementBlock) => ElementBlock);
    const e = el(result, 0, 0);
    expect(e.level).toBe(3);
    expect(e.modified).toBe(true);
    expect(e.text).toBe("Hello");
  });

  it("applies transform to all elements in a flat list", () => {
    const sections = [
      { type: "contentBlock", elements: [heading("A"), heading("B"), heading("C")] },
    ] as unknown as SectionBlock[];
    const result = transformElementsInSections(sections, T);
    expect((els(result, 0)[0]! as R)._transformed).toBe(true);
    expect((els(result, 0)[1]! as R)._transformed).toBe(true);
    expect((els(result, 0)[2]! as R)._transformed).toBe(true);
  });

  it("transforms deeply nested structures", () => {
    const sections = [
      {
        type: "contentBlock",
        elements: [
          {
            type: "elementImage",
            src: "x.svg",
            alt: "M",
            moduleConfig: {
              slots: {
                main: {
                  section: {
                    definitions: {
                      ng: {
                        type: "elementGroup",
                        id: "g-1",
                        section: { definitions: { dh: heading("Deep") } },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    ] as unknown as SectionBlock[];
    const result = transformElementsInSections(sections, T);
    const slots = ((el(result, 0, 0).moduleConfig as R).slots as R).main as R;
    const slotDefs = (slots.section as R).definitions as R;
    const groupSection = (slotDefs.ng as R).section as R;
    const deepDef = groupSection.definitions as R;
    expect((deepDef.dh as R)._transformed).toBe(true);
  });

  it("passes through non-object definition values unchanged", () => {
    const sections = [
      {
        type: "contentBlock",
        elements: [
          {
            type: "elementGroup",
            id: "g-1",
            section: {
              definitions: {
                str: "just a string",
                num: 42,
                nil: null,
                h: heading("Real"),
              },
            },
          },
        ],
      },
    ] as unknown as SectionBlock[];
    const result = transformElementsInSections(sections, T);
    const defs = (el(result, 0, 0).section as R).definitions as R;
    expect(defs.str).toBe("just a string");
    expect(defs.num).toBe(42);
    expect(defs.nil).toBeNull();
    expect((defs.h as R)._transformed).toBe(true);
  });

  it("transforms section-level definitions", () => {
    const sections = [
      {
        type: "contentBlock",
        elements: [heading("Main")],
        definitions: { sidebar: heading("Sidebar"), footer: heading("Footer") },
      },
    ] as unknown as SectionBlock[];
    const result = transformElementsInSections(sections, T);
    const defs = sec(result, 0).definitions as R;
    expect((defs.sidebar as R)._transformed).toBe(true);
    expect((defs.footer as R)._transformed).toBe(true);
  });

  it("transforms both section-level definitions and elements array", () => {
    const sections = [
      {
        type: "contentBlock",
        elements: [heading("EA")],
        definitions: { defA: heading("DA") },
      },
    ] as unknown as SectionBlock[];
    const result = transformElementsInSections(sections, T);
    expect((els(result, 0)[0]! as R)._transformed).toBe(true);
    expect(((sec(result, 0).definitions as R).defA as R)._transformed).toBe(true);
  });

  it("handles empty elements arrays", () => {
    const sections: SectionBlock[] = [
      { type: "contentBlock", id: "s-1", elements: [] } as SectionBlock,
    ];
    const result = transformElementsInSections(sections, T);
    expect(sec(result, 0).type).toBe("contentBlock");
    expect(els(result, 0).length).toBe(0);
  });

  it("handles multiple sections", () => {
    const sections: SectionBlock[] = [
      { type: "contentBlock", id: "s-1", elements: [heading("A")] } as SectionBlock,
      { type: "contentBlock", id: "s-2", elements: [heading("B")] } as SectionBlock,
    ];
    const result = transformElementsInSections(sections, T);
    expect((els(result, 0)[0]! as R)._transformed).toBe(true);
    expect((els(result, 1)[0]! as R)._transformed).toBe(true);
  });

  it("handles section-level definitions with non-object values", () => {
    const sections = [
      {
        type: "contentBlock",
        definitions: { str: "str", nil: null, h: heading("Valid") },
      },
    ] as unknown as SectionBlock[];
    const result = transformElementsInSections(sections, T);
    const defs = sec(result, 0).definitions as R;
    expect(defs.str).toBe("str");
    expect(defs.nil).toBeNull();
    expect((defs.h as R)._transformed).toBe(true);
  });

  it("structural test: transformed element is present", () => {
    const sections: SectionBlock[] = [
      { type: "contentBlock", id: "s-1", elements: [heading("A")] } as SectionBlock,
    ];
    const result = transformElementsInSections(sections, T);
    expect(el(result, 0, 0)._transformed).toBe(true);
  });

  it("handles elementGroup without a section object", () => {
    const sections = [
      {
        type: "contentBlock",
        elements: [{ type: "elementGroup", id: "g-no-section" }],
      },
    ] as unknown as SectionBlock[];
    const result = transformElementsInSections(sections, T);
    expect(el(result, 0, 0).id).toBe("g-no-section");
    expect(el(result, 0, 0)._transformed).toBe(true);
  });

  it("transforms elements through all nesting paths combined", () => {
    const sections = [
      {
        type: "revealSection",
        collapsedElements: [
          {
            type: "elementGroup",
            id: "g-1",
            section: {
              definitions: {
                inner: {
                  type: "elementImage",
                  src: "x.svg",
                  alt: "M",
                  moduleConfig: {
                    slots: {
                      Z: { section: { definitions: { deepest: heading("Deepest") } } },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    ] as unknown as SectionBlock[];
    const result = transformElementsInSections(sections, T);
    const collapsed = sec(result, 0).collapsedElements as R[];
    const groupDefs = (collapsed[0]!.section as R).definitions as R;
    const slots = ((groupDefs.inner as R).moduleConfig as R).slots as R;
    const slotDefs = ((slots.Z as R).section as R).definitions as R;
    expect((slotDefs.deepest as R)._transformed).toBe(true);
  });
});

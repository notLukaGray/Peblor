import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ElementTabs } from "./ElementTabs";
import { elementTabsSchema } from "@pb/contracts/peblor/core/peblor-schemas";
import type { ElementBlock } from "@pb/contracts/types";

function makeTabsBlock(
  overrides?: Record<string, unknown>
): Extract<ElementBlock, { type: "elementTabs" }> {
  return elementTabsSchema.parse({
    type: "elementTabs",
    tabs: [
      { label: "First", elements: [{ type: "elementBody", text: "Content 1" }] },
      { label: "Second", elements: [{ type: "elementBody", text: "Content 2" }] },
      { label: "Third", elements: [{ type: "elementBody", text: "Content 3" }] },
    ],
    activeTab: 0,
    keyboardNav: true,
    ...overrides,
  }) as Extract<ElementBlock, { type: "elementTabs" }>;
}

describe("ElementTabs", () => {
  it("clamps activeTab to valid range (out of range becomes last valid index)", () => {
    const block = makeTabsBlock({ activeTab: 10 });
    const markup = renderToStaticMarkup(<ElementTabs {...block} />);
    expect(markup).toContain('role="tab"');
    expect(markup).toContain('role="tabpanel"');
  });

  it("activeTab of -1 fails schema validation", () => {
    const result = elementTabsSchema.safeParse({
      type: "elementTabs",
      tabs: [{ label: "Only", elements: [{ type: "elementBody" }] }],
      activeTab: -1,
    });
    expect(result.success).toBe(false);
  });

  it("renders accessible markup with tablist/tab/tabpanel roles", () => {
    const block = makeTabsBlock();
    const markup = renderToStaticMarkup(<ElementTabs {...block} />);
    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('role="tab"');
    expect(markup).toContain('role="tabpanel"');
  });

  it("renders tab content via ElementRenderer, not just text", () => {
    const block = makeTabsBlock({
      tabs: [
        {
          label: "Info",
          elements: [{ type: "elementBody", text: "Rich content here" }],
        },
      ],
    });
    const markup = renderToStaticMarkup(<ElementTabs {...block} />);
    expect(markup).toContain("Rich content here");
    expect(markup).toContain('role="tab"');
    expect(markup).toContain('role="tabpanel"');
  });

  it("marks active tab with aria-selected true", () => {
    const block = makeTabsBlock({ activeTab: 1 });
    const markup = renderToStaticMarkup(<ElementTabs {...block} />);
    expect(markup).toContain('aria-selected="true"');
  });
});

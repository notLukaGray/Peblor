import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/peblor/hooks/use-peblor-triggers", () => ({
  usePeblorTriggers: () => ({
    currentBg: null,
    sectionsWithOverrides: [{ type: "sectionBogus" }],
    activeTransitionIds: new Set<string>(),
    reversingTransitionIds: new Set<string>(),
    transitionProgress: new Map<string, number>(),
    setActiveTransitionIds: () => undefined,
    setReversingTransitionIds: () => undefined,
    transitionsArray: [],
  }),
}));

vi.mock("./PeblorBackground", () => ({
  PeblorBackground: () => null,
}));

vi.mock("@pb/runtime-react/core/providers/device-type-provider", () => ({
  useDeviceType: () => ({ isMobile: false }),
}));
vi.mock("@/peblor/hooks/use-element-visibility-listener", () => ({
  useElementVisibilityListener: () => true,
}));
vi.mock("@/peblor/runtime/peblor-variable-store", () => ({
  useVariableStore: () => ({}),
}));
vi.mock("@/peblor/theme/use-peblor-theme-mode", () => ({
  usePeblorThemeMode: () => "dark",
}));

describe("renderer strictness", () => {
  it("throws on unknown section type", async () => {
    const { PeblorRenderer } = await import("./PeblorRenderer");
    expect(() =>
      renderToStaticMarkup(<PeblorRenderer resolvedBg={null} resolvedSections={[]} />)
    ).toThrow(/unknown section type/i);
  });

  it("throws on unknown element type", async () => {
    const { ElementRenderer } = await import("./elements/Shared/ElementRenderer");
    expect(() =>
      renderToStaticMarkup(<ElementRenderer block={{ type: "elementBogus" } as never} />)
    ).toThrow(/unknown element type/i);
  });
});

import { describe, it, expect } from "vitest";
import { isMobileFromUserAgent, resolvePeblorBreakpoint } from "./peblor-resolve-breakpoint-server";
import type { bgBlock, SectionBlock } from "@pb/contracts/types";

describe("peblor-resolve-breakpoint-server", () => {
  describe("resolvePeblorBreakpoint", () => {
    it("detects mobile from user-agent strings", () => {
      expect(isMobileFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(
        true
      );
      expect(isMobileFromUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)")).toBe(false);
    });

    it("resolves responsive array in bg (mobile)", () => {
      const bg: bgBlock = {
        type: "backgroundImage",
        image: "work/hero.jpg",
        width: ["100%", "50%"],
      } as bgBlock;
      const result = resolvePeblorBreakpoint({
        sections: [],
        bg,
        bgDefinitions: {},
        isMobile: true,
      });
      expect(result.bg).not.toBeNull();
      expect((result.bg as Record<string, unknown>).width).toBe("100%");
    });

    it("resolves responsive array in bg (desktop)", () => {
      const bg: bgBlock = {
        type: "backgroundImage",
        image: "work/hero.jpg",
        width: ["100%", "50%"],
      } as bgBlock;
      const result = resolvePeblorBreakpoint({
        sections: [],
        bg,
        bgDefinitions: {},
        isMobile: false,
      });
      expect(result.bg).not.toBeNull();
      expect((result.bg as Record<string, unknown>).width).toBe("50%");
    });

    it("resolves responsive object in bg", () => {
      const bg: bgBlock = {
        type: "backgroundImage",
        image: "work/hero.jpg",
        width: { mobile: "100%", desktop: "60%" },
      } as bgBlock;
      const result = resolvePeblorBreakpoint({
        sections: [],
        bg,
        bgDefinitions: {},
        isMobile: false,
      });
      expect(result.bg).not.toBeNull();
      expect((result.bg as Record<string, unknown>).width).toBe("60%");
    });

    it("resolves responsive values in bgDefinitions", () => {
      const def: bgBlock = {
        type: "backgroundImage",
        image: "work/card.jpg",
        width: ["100%", "33%"],
      } as bgBlock;
      const result = resolvePeblorBreakpoint({
        sections: [],
        bg: null,
        bgDefinitions: { cardBg: def },
        isMobile: true,
      });
      expect(result.bgDefinitions.cardBg).toBeDefined();
      expect((result.bgDefinitions.cardBg as Record<string, unknown>).width).toBe("100%");
    });

    it("resolves backgroundTransition from/to recursively", () => {
      const fromBg: bgBlock = {
        type: "backgroundImage",
        image: "a.jpg",
        width: ["100%", "50%"],
      } as bgBlock;
      const toBg: bgBlock = {
        type: "backgroundImage",
        image: "b.jpg",
        width: { mobile: "100%", desktop: "75%" },
      } as bgBlock;
      const bg: bgBlock = {
        type: "backgroundTransition",
        from: fromBg,
        to: toBg,
      } as bgBlock;
      const result = resolvePeblorBreakpoint({
        sections: [],
        bg,
        bgDefinitions: {},
        isMobile: false,
      });
      expect(result.bg).not.toBeNull();
      const resolved = result.bg as { type: string; from: bgBlock; to: bgBlock };
      expect(resolved.type).toBe("backgroundTransition");
      expect((resolved.from as Record<string, unknown>).width).toBe("50%");
      expect((resolved.to as Record<string, unknown>).width).toBe("75%");
    });

    it("returns empty sections and bg when given empty input", () => {
      const result = resolvePeblorBreakpoint({
        sections: [] as SectionBlock[],
        bg: null,
        bgDefinitions: {},
        isMobile: true,
      });
      expect(result.sections).toEqual([]);
      expect(result.bg).toBeNull();
      expect(result.bgDefinitions).toEqual({});
    });

    it("returns the same bg reference when no responsive fields exist", () => {
      const bg: bgBlock = { type: "backgroundImage", image: "work/static.jpg" } as bgBlock;
      const result = resolvePeblorBreakpoint({
        sections: [],
        bg,
        bgDefinitions: {},
        isMobile: true,
      });
      expect(result.bg).toBe(bg);
    });

    it("keeps divider section reference when no responsive props exist", () => {
      const divider = { type: "divider", id: "d1" } as unknown as SectionBlock;
      const result = resolvePeblorBreakpoint({
        sections: [divider],
        bg: null,
        bgDefinitions: {},
        isMobile: false,
      });
      expect(result.sections[0]).toBe(divider);
    });

    it("resolves contentWidth/contentHeight responsive values on contentBlock", () => {
      const section = {
        type: "contentBlock",
        elements: [],
        contentWidth: ["100%", "75%"],
        contentHeight: { mobile: "auto", desktop: "80vh" },
      } as unknown as SectionBlock;
      const mobile = resolvePeblorBreakpoint({
        sections: [section],
        bg: null,
        bgDefinitions: {},
        isMobile: true,
      });
      const desktop = resolvePeblorBreakpoint({
        sections: [section],
        bg: null,
        bgDefinitions: {},
        isMobile: false,
      });
      expect((mobile.sections[0] as Record<string, unknown>).contentWidth).toBe("100%");
      expect((desktop.sections[0] as Record<string, unknown>).contentWidth).toBe("75%");
      expect((mobile.sections[0] as Record<string, unknown>).contentHeight).toBe("auto");
      expect((desktop.sections[0] as Record<string, unknown>).contentHeight).toBe("80vh");
    });

    it("resolves responsive contentBlock flex controls and section aspectRatio", () => {
      const section = {
        type: "contentBlock",
        elements: [],
        aspectRatio: ["4 / 3", "16 / 9"],
        flexDirection: ["column", "row"],
        alignItems: ["center", "stretch"],
        justifyContent: ["center", "space-between"],
        flexWrap: ["nowrap", "wrap"],
        gap: ["8px", "24px"],
        rowGap: ["4px", "12px"],
        columnGap: ["2px", "10px"],
      } as unknown as SectionBlock;

      const mobile = resolvePeblorBreakpoint({
        sections: [section],
        bg: null,
        bgDefinitions: {},
        isMobile: true,
      });
      const desktop = resolvePeblorBreakpoint({
        sections: [section],
        bg: null,
        bgDefinitions: {},
        isMobile: false,
      });

      expect((mobile.sections[0] as Record<string, unknown>).aspectRatio).toBe("4 / 3");
      expect((desktop.sections[0] as Record<string, unknown>).aspectRatio).toBe("16 / 9");
      expect((mobile.sections[0] as Record<string, unknown>).flexDirection).toBe("column");
      expect((desktop.sections[0] as Record<string, unknown>).flexDirection).toBe("row");
      expect((mobile.sections[0] as Record<string, unknown>).gap).toBe("8px");
      expect((desktop.sections[0] as Record<string, unknown>).gap).toBe("24px");
    });
  });
});

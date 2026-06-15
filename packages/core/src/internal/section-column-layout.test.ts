import { describe, it, expect } from "vitest";
import {
  resolveColumnCount,
  resolveElementOrder,
  resolveColumnAssignments,
  resolveColumnGaps,
  resolveColumnWidths,
  resolveColumnStyles,
  resolveColumnSpan,
  resolveItemStyles,
  resolveGridMode,
  resolveItemLayout,
  buildElementMap,
  orderElementsByOrder,
  groupElementsByColumn,
  buildColumnLayoutSegments,
  buildGridLayoutItems,
  getColumnFlexStyles,
  getGapStyle,
  DEFAULT_COLUMN_WIDTHS,
} from "./section-column-layout";

describe("section-column-layout", () => {
  describe("resolveColumnCount", () => {
    it("returns number when columns is number", () => {
      expect(resolveColumnCount(2, true)).toBe(2);
      expect(resolveColumnCount(1, false)).toBe(1);
    });
    it("returns md when isDesktop and tier map has md", () => {
      expect(resolveColumnCount({ base: 1, md: 3 }, true)).toBe(3);
    });
    it("returns base when !isDesktop and tier map has base", () => {
      expect(resolveColumnCount({ base: 1, md: 3 }, false)).toBe(1);
    });
    it("cascades base to desktop when md is missing", () => {
      expect(resolveColumnCount({ base: 2 }, true)).toBe(2);
    });
    it("returns default 1 when only md is set and isDesktop is false", () => {
      expect(resolveColumnCount({ md: 4 }, false)).toBe(1);
    });
    it("returns 1 when columns undefined", () => {
      expect(resolveColumnCount(undefined, true)).toBe(1);
    });
  });

  describe("resolveElementOrder", () => {
    const elements = [
      { id: "a", type: "el" },
      { id: "b", type: "el" },
      { id: "c", type: "el" },
    ];
    it("returns element ids in order when elementOrder is undefined", () => {
      expect(resolveElementOrder(undefined, elements, true)).toEqual(["a", "b", "c"]);
    });
    it("returns array as-is when elementOrder is array", () => {
      expect(resolveElementOrder(["c", "a", "b"], elements, true)).toEqual(["c", "a", "b"]);
    });
    it("returns md order when isDesktop and tier map", () => {
      expect(resolveElementOrder({ base: ["a", "b"], md: ["b", "a"] }, elements, true)).toEqual([
        "b",
        "a",
      ]);
    });
    it("returns base order when !isDesktop and tier map", () => {
      expect(resolveElementOrder({ base: ["a", "b"], md: ["b", "a"] }, elements, false)).toEqual([
        "a",
        "b",
      ]);
    });
  });

  describe("resolveColumnAssignments", () => {
    it("returns empty object when undefined", () => {
      expect(resolveColumnAssignments(undefined, true)).toEqual({});
    });
    it("returns object as-is when no tier keys", () => {
      expect(resolveColumnAssignments({ el1: 0, el2: 1 }, true)).toEqual({ el1: 0, el2: 1 });
    });
    it("returns md map when isDesktop", () => {
      expect(resolveColumnAssignments({ base: { a: 0 }, md: { a: 1, b: 0 } }, true)).toEqual({
        a: 1,
        b: 0,
      });
    });
    it("returns base map when !isDesktop", () => {
      expect(resolveColumnAssignments({ base: { a: 0 }, md: { a: 1 } }, false)).toEqual({
        a: 0,
      });
    });
  });

  describe("resolveColumnGaps", () => {
    it("returns undefined when columnGaps undefined", () => {
      expect(resolveColumnGaps(undefined, true)).toBeUndefined();
    });
    it("returns string as-is", () => {
      expect(resolveColumnGaps("1rem", true)).toBe("1rem");
    });
    it("returns array as-is", () => {
      expect(resolveColumnGaps(["0.5rem", "1rem"], true)).toEqual(["0.5rem", "1rem"]);
    });
    it("returns md value when isDesktop and tier map", () => {
      expect(resolveColumnGaps({ base: "0.5rem", md: "1rem" }, true)).toBe("1rem");
    });
  });

  describe("resolveColumnWidths", () => {
    it("returns array as-is", () => {
      expect(resolveColumnWidths([1, 2], true)).toEqual([1, 2]);
    });
    it("resolves responsive tier map", () => {
      expect(resolveColumnWidths({ base: [1], md: [1, 2] }, true)).toEqual([1, 2]);
      expect(resolveColumnWidths({ base: [1], md: [1, 2] }, false)).toEqual([1]);
    });
  });

  describe("resolveColumnStyles", () => {
    it("returns array as-is", () => {
      expect(resolveColumnStyles([{ fill: "#000" }], true)).toEqual([{ fill: "#000" }]);
    });
    it("resolves responsive tier map", () => {
      expect(
        resolveColumnStyles({ base: [{ fill: "#111" }], md: [{ fill: "#222" }] }, true)
      ).toEqual([{ fill: "#222" }]);
    });
  });

  describe("resolveColumnSpan", () => {
    it("returns fixed span map as-is", () => {
      expect(resolveColumnSpan({ hero: "all" }, true)).toEqual({ hero: "all" });
    });
    it("resolves responsive span map by breakpoint", () => {
      expect(resolveColumnSpan({ base: { hero: 1 }, md: { hero: 2 } }, true)).toEqual({
        hero: 2,
      });
      expect(resolveColumnSpan({ base: { hero: 1 }, md: { hero: 2 } }, false)).toEqual({
        hero: 1,
      });
    });
  });

  describe("resolveItemStyles", () => {
    it("returns fixed itemStyles as-is", () => {
      expect(resolveItemStyles({ a: { fill: "#000" } }, true)).toEqual({ a: { fill: "#000" } });
    });
    it("resolves responsive itemStyles by breakpoint", () => {
      expect(
        resolveItemStyles({ base: { a: { fill: "#111" } }, md: { a: { fill: "#222" } } }, true)
      ).toEqual({ a: { fill: "#222" } });
    });
  });

  describe("resolveGridMode", () => {
    it("defaults to columns", () => {
      expect(resolveGridMode(undefined, true)).toBe("columns");
    });
    it("resolves responsive mode", () => {
      expect(resolveGridMode({ base: "columns", md: "grid" }, true)).toBe("grid");
      expect(resolveGridMode({ base: "columns", md: "grid" }, false)).toBe("columns");
    });
  });

  describe("resolveItemLayout", () => {
    it("returns fixed item layout map", () => {
      expect(resolveItemLayout({ a: { column: 1 } }, true)).toEqual({ a: { column: 1 } });
    });
    it("resolves responsive itemLayout map by breakpoint", () => {
      expect(
        resolveItemLayout({ base: { a: { column: 0 } }, md: { a: { column: 2 } } }, true)
      ).toEqual({ a: { column: 2 } });
    });
  });

  // ── Tier-map resolution semantics ───────────────────────────────────────
  // These assert that tier-map inputs `{ base, md }` resolve correctly
  // with mobile-first cascade semantics.

  describe("tier-map resolution semantics", () => {
    it("resolveColumnCount: {base,md} resolves correctly", () => {
      expect(resolveColumnCount({ base: 1, md: 3 }, true)).toBe(3);
      expect(resolveColumnCount({ base: 1, md: 3 }, false)).toBe(1);
    });

    it("resolveElementOrder: {base,md} resolves correctly", () => {
      const elements = [{ id: "a" }, { id: "b" }];
      expect(resolveElementOrder({ base: ["b", "a"], md: ["a", "b"] }, elements, true)).toEqual([
        "a",
        "b",
      ]);
      expect(resolveElementOrder({ base: ["b", "a"], md: ["a", "b"] }, elements, false)).toEqual([
        "b",
        "a",
      ]);
    });

    it("resolveColumnAssignments: {base,md} resolves correctly", () => {
      expect(resolveColumnAssignments({ base: { a: 0 }, md: { a: 1, b: 0 } }, true)).toEqual({
        a: 1,
        b: 0,
      });
      expect(resolveColumnAssignments({ base: { a: 0 }, md: { a: 1, b: 0 } }, false)).toEqual({
        a: 0,
      });
    });

    it("resolveColumnGaps: {base,md} resolves correctly", () => {
      expect(resolveColumnGaps({ base: "0.5rem", md: "1rem" }, true)).toBe("1rem");
      expect(resolveColumnGaps({ base: "0.5rem", md: "1rem" }, false)).toBe("0.5rem");
    });

    it("resolveColumnWidths: {base,md} resolves correctly", () => {
      expect(resolveColumnWidths({ base: [1], md: [1, 2] }, true)).toEqual([1, 2]);
      expect(resolveColumnWidths({ base: [1], md: [1, 2] }, false)).toEqual([1]);
    });

    it("resolveColumnStyles: {base,md} resolves correctly", () => {
      expect(
        resolveColumnStyles({ base: [{ fill: "#111" }], md: [{ fill: "#222" }] }, true)
      ).toEqual([{ fill: "#222" }]);
      expect(
        resolveColumnStyles({ base: [{ fill: "#111" }], md: [{ fill: "#222" }] }, false)
      ).toEqual([{ fill: "#111" }]);
    });

    it("resolveColumnSpan: {base,md} resolves correctly", () => {
      expect(resolveColumnSpan({ base: { hero: 1 }, md: { hero: 2 } }, true)).toEqual({ hero: 2 });
      expect(resolveColumnSpan({ base: { hero: 1 }, md: { hero: 2 } }, false)).toEqual({ hero: 1 });
    });

    it("resolveItemStyles: {base,md} resolves correctly", () => {
      expect(
        resolveItemStyles({ base: { a: { fill: "#111" } }, md: { a: { fill: "#222" } } }, true)
      ).toEqual({ a: { fill: "#222" } });
      expect(
        resolveItemStyles({ base: { a: { fill: "#111" } }, md: { a: { fill: "#222" } } }, false)
      ).toEqual({ a: { fill: "#111" } });
    });

    it("resolveGridMode: {base,md} resolves correctly", () => {
      expect(resolveGridMode({ base: "columns", md: "grid" }, true)).toBe("grid");
      expect(resolveGridMode({ base: "columns", md: "grid" }, false)).toBe("columns");
    });

    it("resolveItemLayout: {base,md} resolves correctly", () => {
      expect(
        resolveItemLayout({ base: { a: { column: 0 } }, md: { a: { column: 2 } } }, true)
      ).toEqual({ a: { column: 2 } });
      expect(
        resolveItemLayout({ base: { a: { column: 0 } }, md: { a: { column: 2 } } }, false)
      ).toEqual({ a: { column: 0 } });
    });

    it("base-only tier cascades to desktop (mobile-first)", () => {
      expect(resolveColumnCount({ base: 2 }, true)).toBe(2);
      expect(resolveColumnCount({ base: 2 }, false)).toBe(2);
    });

    it("higher tiers (lg, xl) are ignored in JS resolution", () => {
      // lg/xl only affect CSS @media; JS resolution falls back to the highest
      // defined tier at the representative width (0 for mobile, 768 for desktop).
      expect(resolveColumnCount({ base: 1, lg: 4 }, true)).toBe(1);
      expect(resolveColumnCount({ base: 1, lg: 4 }, false)).toBe(1);
    });

    it("{base:X} cascades to desktop — both breakpoints get X", () => {
      expect(resolveColumnCount({ base: 3 }, true)).toBe(3);
      expect(resolveColumnCount({ base: 3 }, false)).toBe(3);
    });

    it("{md:X} yields undefined on mobile for resolvers without default fallback", () => {
      // Mobile-first cascade: md (768px) is above mobile representative width (0px)
      // so {md:X} has no defined value for mobile. resolveColumnCount has a ?? 1
      // fallback, but other resolvers return undefined.
      expect(resolveColumnCount({ md: 3 }, false)).toBe(1);
      expect(resolveColumnCount({ md: 3 }, true)).toBe(3);
      expect(resolveColumnWidths({ md: ["1fr", "2fr"] }, false)).toBeUndefined();
      expect(resolveColumnGaps({ md: "1.5rem" }, false)).toBeUndefined();
    });

    it("{base:X} cascades to desktop for columnWidths", () => {
      expect(resolveColumnWidths({ base: ["1fr", "1fr"] }, true)).toEqual(["1fr", "1fr"]);
      expect(resolveColumnWidths({ base: ["1fr", "1fr"] }, false)).toEqual(["1fr", "1fr"]);
      expect(resolveColumnWidths({ md: ["1fr", "1fr"] }, false)).toBeUndefined();
    });

    it("{base:X} cascades to desktop for columnGaps", () => {
      expect(resolveColumnGaps({ base: "1.5rem" }, true)).toBe("1.5rem");
      expect(resolveColumnGaps({ base: "1.5rem" }, false)).toBe("1.5rem");
      expect(resolveColumnGaps({ md: "1.5rem" }, false)).toBeUndefined();
    });

    it("{base:X} cascades to desktop for columnSpan", () => {
      const span = { hero: "all" as const };
      expect(resolveColumnSpan({ base: span }, true)).toEqual(span);
      expect(resolveColumnSpan({ base: span }, false)).toEqual(span);
      expect(resolveColumnSpan({ md: span }, false)).toBeUndefined();
    });

    it("{base:X} cascades to desktop for itemLayout", () => {
      const layout = { a: { column: 0, row: 0 } };
      expect(resolveItemLayout({ base: layout }, true)).toEqual(layout);
      expect(resolveItemLayout({ base: layout }, false)).toEqual(layout);
      expect(resolveItemLayout({ md: layout }, false)).toBeUndefined();
    });
  });

  describe("buildElementMap", () => {
    it("maps id to element", () => {
      const el = { id: "x", type: "el" };
      const map = buildElementMap([el]);
      expect(map.get("x")).toBe(el);
    });
    it("skips elements without id", () => {
      const map = buildElementMap([{ type: "el" }]);
      expect(map.size).toBe(0);
    });
  });

  describe("orderElementsByOrder", () => {
    it("returns elements in specified order", () => {
      const elements = [
        { id: "a", v: 1 },
        { id: "b", v: 2 },
        { id: "c", v: 3 },
      ];
      const map = buildElementMap(elements);
      const ordered = orderElementsByOrder(["c", "a", "b"], map, elements);
      expect(ordered.map((e) => e.id)).toEqual(["c", "a", "b"]);
    });
    it("appends elements not in order", () => {
      const elements = [
        { id: "a", v: 1 },
        { id: "b", v: 2 },
      ];
      const map = buildElementMap(elements);
      const ordered = orderElementsByOrder(["b"], map, elements);
      expect(ordered.map((e) => e.id)).toEqual(["b", "a"]);
    });
  });

  describe("groupElementsByColumn", () => {
    it("distributes elements by column assignment", () => {
      const elements = [
        { id: "a", v: 1 },
        { id: "b", v: 2 },
        { id: "c", v: 3 },
      ];
      const assignments = { a: 0, b: 1, c: 0 };
      const groups = groupElementsByColumn(elements, 2, assignments);
      expect(groups).toHaveLength(2);
      expect(groups[0]!.map((e) => e.id)).toEqual(["a", "c"]);
      expect(groups[1]!.map((e) => e.id)).toEqual(["b"]);
    });
    it("auto-places unassigned/invalid elements instead of dropping them", () => {
      const elements = [{ id: "a", v: 1 }, { v: 2 }];
      const groups = groupElementsByColumn(elements, 1, { a: 0 });
      expect(groups[0]).toHaveLength(2);
      expect(groups[0]![0]!.id).toBe("a");
    });
    it("round-robins unassigned elements across columns", () => {
      const elements = [{ id: "a" }, { id: "b" }, { id: "c" }];
      const groups = groupElementsByColumn(elements, 2, {});
      expect(groups[0]!.map((e) => e.id)).toEqual(["a", "c"]);
      expect(groups[1]!.map((e) => e.id)).toEqual(["b"]);
    });
  });

  describe("buildColumnLayoutSegments", () => {
    it("keeps normal column stacks when no spans", () => {
      const elements = [{ id: "a" }, { id: "b" }];
      const segments = buildColumnLayoutSegments(elements, 2, { a: 0, b: 1 }, undefined);
      expect(segments).toHaveLength(1);
      expect(segments[0]?.type).toBe("columns");
    });

    it("splits rows around span-all items and preserves order", () => {
      const elements = [{ id: "a" }, { id: "hero" }, { id: "b" }];
      const segments = buildColumnLayoutSegments(
        elements,
        2,
        { a: 0, hero: 0, b: 1 },
        { hero: "all" }
      );
      expect(segments.map((s) => s.type)).toEqual(["columns", "span", "columns"]);
      expect(segments[1]).toMatchObject({ type: "span", columnStart: 0, columnSpan: 2 });
    });

    it("supports numeric span with bounded start column", () => {
      const elements = [{ id: "feature" }];
      const segments = buildColumnLayoutSegments(elements, 3, { feature: 2 }, { feature: 2 });
      expect(segments[0]).toMatchObject({ type: "span", columnStart: 1, columnSpan: 2 });
    });
  });

  describe("buildGridLayoutItems", () => {
    it("uses itemLayout placement and spans", () => {
      const items = buildGridLayoutItems(
        [{ id: "a" }, { id: "b" }],
        3,
        {},
        { b: "all" },
        { a: { column: 1, row: 0 }, b: { rowSpan: 2 } }
      );
      expect(items[0]).toMatchObject({ columnStart: 2, rowStart: 1 });
      expect(items[1]).toMatchObject({ columnSpan: 3, rowSpan: 2 });
    });
    it("falls back to columnAssignments when itemLayout omits column", () => {
      const items = buildGridLayoutItems([{ id: "a" }], 2, { a: 1 }, undefined, undefined);
      expect(items[0]).toMatchObject({ columnStart: 2 });
    });
  });

  describe("getColumnFlexStyles", () => {
    it("returns hug (0 0 auto) for single column when columnWidths is hug", () => {
      const styles = getColumnFlexStyles(DEFAULT_COLUMN_WIDTHS, 1);
      expect(styles).toHaveLength(1);
      expect(styles[0]!.flex).toBe("0 0 auto");
    });
    it("returns equal (1 1 0%) for single column when columnWidths is equal", () => {
      const styles = getColumnFlexStyles("equal", 1);
      expect(styles[0]!.flex).toBe("1 1 0%");
    });
    it("uses the first width entry for single-column responsive collapse", () => {
      const styles = getColumnFlexStyles([1, 2], 1);
      expect(styles[0]!.flex).toBe("1 1 0%");
    });
    it("returns hug for each column when hug and count > 1", () => {
      const styles = getColumnFlexStyles("hug", 3);
      expect(styles).toHaveLength(3);
      styles.forEach((s) => expect(s.flex).toBe("0 0 auto"));
    });
    it("returns equal for each column when equal and count > 1", () => {
      const styles = getColumnFlexStyles("equal", 2);
      expect(styles).toHaveLength(2);
      styles.forEach((s) => expect(s.flex).toBe("1 1 0%"));
    });
    it("handles array of widths", () => {
      const styles = getColumnFlexStyles([1, 2, "hug"], 3);
      expect(styles[0]!.flex).toBe("1 1 0%");
      expect(styles[1]!.flex).toBe("2 2 0%");
      expect(styles[2]!.flex).toBe("0 0 auto");
    });
  });

  describe("getGapStyle", () => {
    it("returns undefined when no gaps", () => {
      expect(getGapStyle(undefined, 1)).toBeUndefined();
    });
    it("returns rowGap for single column", () => {
      expect(getGapStyle("1rem", 1)).toEqual({ rowGap: "1rem", columnGap: 0 });
    });
    it("returns columnGap for multi column", () => {
      expect(getGapStyle("1rem", 2)).toEqual({ columnGap: "1rem", rowGap: 0 });
    });
    it("returns space-between for auto and multi column", () => {
      expect(getGapStyle("auto", 2)).toEqual({ justifyContent: "space-between", rowGap: 0 });
    });
  });
});

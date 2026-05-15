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
    it("returns desktop when isDesktop and object has desktop", () => {
      expect(resolveColumnCount({ desktop: 3, mobile: 1 }, true)).toBe(3);
    });
    it("returns mobile when !isDesktop and object has mobile", () => {
      expect(resolveColumnCount({ desktop: 3, mobile: 1 }, false)).toBe(1);
    });
    it("falls back to other breakpoint when one missing", () => {
      expect(resolveColumnCount({ mobile: 2 }, true)).toBe(2);
      expect(resolveColumnCount({ desktop: 4 }, false)).toBe(4);
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
    it("returns desktop order when isDesktop and object", () => {
      expect(
        resolveElementOrder({ desktop: ["b", "a"], mobile: ["a", "b"] }, elements, true)
      ).toEqual(["b", "a"]);
    });
    it("returns mobile order when !isDesktop and object", () => {
      expect(
        resolveElementOrder({ desktop: ["b", "a"], mobile: ["a", "b"] }, elements, false)
      ).toEqual(["a", "b"]);
    });
  });

  describe("resolveColumnAssignments", () => {
    it("returns empty object when undefined", () => {
      expect(resolveColumnAssignments(undefined, true)).toEqual({});
    });
    it("returns object as-is when no mobile/desktop keys", () => {
      expect(resolveColumnAssignments({ el1: 0, el2: 1 }, true)).toEqual({ el1: 0, el2: 1 });
    });
    it("returns desktop map when isDesktop", () => {
      expect(resolveColumnAssignments({ mobile: { a: 0 }, desktop: { a: 1, b: 0 } }, true)).toEqual(
        { a: 1, b: 0 }
      );
    });
    it("returns mobile map when !isDesktop", () => {
      expect(resolveColumnAssignments({ mobile: { a: 0 }, desktop: { a: 1 } }, false)).toEqual({
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
    it("returns desktop value when isDesktop and object", () => {
      expect(resolveColumnGaps({ mobile: "0.5rem", desktop: "1rem" }, true)).toBe("1rem");
    });
  });

  describe("resolveColumnWidths", () => {
    it("returns array as-is", () => {
      expect(resolveColumnWidths([1, 2], true)).toEqual([1, 2]);
    });
    it("resolves responsive object", () => {
      expect(resolveColumnWidths({ mobile: [1], desktop: [1, 2] }, true)).toEqual([1, 2]);
      expect(resolveColumnWidths({ mobile: [1], desktop: [1, 2] }, false)).toEqual([1]);
    });
  });

  describe("resolveColumnStyles", () => {
    it("returns array as-is", () => {
      expect(resolveColumnStyles([{ fill: "#000" }], true)).toEqual([{ fill: "#000" }]);
    });
    it("resolves responsive object", () => {
      expect(
        resolveColumnStyles({ mobile: [{ fill: "#111" }], desktop: [{ fill: "#222" }] }, true)
      ).toEqual([{ fill: "#222" }]);
    });
  });

  describe("resolveColumnSpan", () => {
    it("returns fixed span map as-is", () => {
      expect(resolveColumnSpan({ hero: "all" }, true)).toEqual({ hero: "all" });
    });
    it("resolves responsive span map by breakpoint", () => {
      expect(resolveColumnSpan({ mobile: { hero: 1 }, desktop: { hero: 2 } }, true)).toEqual({
        hero: 2,
      });
      expect(resolveColumnSpan({ mobile: { hero: 1 }, desktop: { hero: 2 } }, false)).toEqual({
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
        resolveItemStyles(
          { mobile: { a: { fill: "#111" } }, desktop: { a: { fill: "#222" } } },
          true
        )
      ).toEqual({ a: { fill: "#222" } });
    });
  });

  describe("resolveGridMode", () => {
    it("defaults to columns", () => {
      expect(resolveGridMode(undefined, true)).toBe("columns");
    });
    it("resolves responsive mode", () => {
      expect(resolveGridMode({ mobile: "columns", desktop: "grid" }, true)).toBe("grid");
      expect(resolveGridMode({ mobile: "columns", desktop: "grid" }, false)).toBe("columns");
    });
  });

  describe("resolveItemLayout", () => {
    it("returns fixed item layout map", () => {
      expect(resolveItemLayout({ a: { column: 1 } }, true)).toEqual({ a: { column: 1 } });
    });
    it("resolves responsive itemLayout map by breakpoint", () => {
      expect(
        resolveItemLayout({ mobile: { a: { column: 0 } }, desktop: { a: { column: 2 } } }, true)
      ).toEqual({ a: { column: 2 } });
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

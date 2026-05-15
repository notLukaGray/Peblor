import { describe, expect, it, vi } from "vitest";
import {
  extractAbsolutePositionStyle,
  extractAutoLayoutProps,
  extractConstraintPosition,
  extractSectionPlacementFromParent,
} from "./layout-auto-props";
import { getBoundingRect } from "@figma-plugin/helpers";

vi.mock("@figma-plugin/helpers", () => ({
  getBoundingRect: vi.fn(() => ({ x: 0, y: 0, x2: 140, y2: 70, width: 140, height: 70 })),
}));

describe("layout-auto-props absolute positioning", () => {
  it("uses visual bounding dimensions for rotated nodes", () => {
    const style = extractAbsolutePositionStyle({
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      rotation: 30,
    } as unknown as SceneNode & { x: number; y: number; width: number; height: number });

    expect(vi.mocked(getBoundingRect)).toHaveBeenCalled();
    expect(style.figmaConstraints).toMatchObject({
      horizontal: "LEFT",
      vertical: "TOP",
      x: 10,
      y: 20,
      width: 140,
      height: 70,
    });
  });

  it("uses raw dimensions for non-rotated nodes", () => {
    const style = extractAbsolutePositionStyle({
      x: 5,
      y: 6,
      width: 100,
      height: 50,
      rotation: 0,
    } as unknown as SceneNode & { x: number; y: number; width: number; height: number });

    expect(style.figmaConstraints).toMatchObject({
      horizontal: "LEFT",
      vertical: "TOP",
      x: 5,
      y: 6,
      width: 100,
      height: 50,
    });
  });

  it("computes right/bottom offsets from visual bounding size for rotated nodes", () => {
    const style = extractConstraintPosition(
      {
        x: 20,
        y: 30,
        width: 100,
        height: 50,
        rotation: 15,
        constraints: { horizontal: "RIGHT", vertical: "BOTTOM" },
      } as unknown as SceneNode & { x: number; y: number; width: number; height: number },
      400,
      300
    );

    expect(style.figmaConstraints).toMatchObject({
      horizontal: "RIGHT",
      vertical: "BOTTOM",
      right: 240,
      bottom: 200,
      width: 140,
      height: 70,
      parentWidth: 400,
      parentHeight: 300,
    });
  });
});

describe("extractAutoLayoutProps primary axis", () => {
  it("maps SPACE_EVENLY / SPACE_AROUND at runtime to justify-content", () => {
    const base = {
      layoutMode: "HORIZONTAL" as const,
      primaryAxisAlignItems: "SPACE_EVENLY" as const,
      counterAxisAlignItems: "MIN" as const,
      itemSpacing: 0,
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      children: [{}, {}],
    };
    const even = extractAutoLayoutProps(base as unknown as FrameNode);
    expect(even.justifyContent).toBe("space-evenly");
    const around = extractAutoLayoutProps({
      ...base,
      primaryAxisAlignItems: "SPACE_AROUND",
    } as unknown as FrameNode);
    expect(around.justifyContent).toBe("space-around");
  });

  it("preserves negative packed spacing as gap", () => {
    const props = extractAutoLayoutProps({
      layoutMode: "HORIZONTAL",
      primaryAxisAlignItems: "MIN",
      counterAxisAlignItems: "MIN",
      itemSpacing: -24,
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      children: [{}, {}],
    } as unknown as FrameNode);
    expect(props.gap).toBe("-24px");
  });

  it("emits var-bound zero padding side instead of dropping it", () => {
    (
      globalThis as unknown as {
        figma: {
          variables: { getVariableById: (id: string) => { name: string; resolvedType: string } };
        };
      }
    ).figma = {
      variables: {
        getVariableById: () => ({ name: "spacing/zero-top", resolvedType: "FLOAT" }),
      },
    };
    const props = extractAutoLayoutProps({
      layoutMode: "VERTICAL",
      primaryAxisAlignItems: "MIN",
      counterAxisAlignItems: "MIN",
      itemSpacing: 0,
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      boundVariables: {
        paddingTop: { type: "VARIABLE_ALIAS", id: "v-pad-top" },
      },
      children: [{}, {}],
    } as unknown as FrameNode);
    expect(props.paddingTop).toBe("var(--spacing-zero-top, 0px)");
  });

  it("uses gap auto when child geometry implies non-zero spacing but itemSpacing is 0", () => {
    const child0 = { x: 0, y: 0, width: 100, height: 50, layoutPositioning: "AUTO" };
    const child1 = { x: 70, y: 0, width: 100, height: 50, layoutPositioning: "AUTO" };
    const props = extractAutoLayoutProps({
      layoutMode: "HORIZONTAL",
      primaryAxisAlignItems: "MIN",
      counterAxisAlignItems: "MIN",
      itemSpacing: 0,
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      children: [child0, child1],
    } as unknown as FrameNode);
    expect(props.gap).toBe("auto");
  });

  it("maps horizontal fill sizing to flex growth instead of hard 100% width", () => {
    const props = extractAutoLayoutProps({
      layoutMode: "VERTICAL",
      layoutSizingHorizontal: "FILL",
      layoutSizingVertical: "HUG",
      primaryAxisAlignItems: "MIN",
      counterAxisAlignItems: "MIN",
      itemSpacing: 0,
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      children: [{}, {}],
      parent: {
        type: "FRAME",
        layoutMode: "HORIZONTAL",
      },
    } as unknown as FrameNode);

    expect(props.width).toBeUndefined();
    expect(props.wrapperStyle).toMatchObject({ flex: "1 1 0%", minWidth: 0 });
  });
});

describe("extractSectionPlacementFromParent baseline", () => {
  it("does not force section align=left when parent counter-axis is BASELINE", () => {
    const child = {
      parent: {
        type: "FRAME",
        layoutMode: "HORIZONTAL",
        counterAxisAlignItems: "BASELINE",
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
      },
      layoutAlign: "INHERIT",
    };
    const p = extractSectionPlacementFromParent(child as unknown as FrameNode);
    expect(p.align).toBeUndefined();
  });

  it("does not map horizontal-parent cross-axis MAX to section align", () => {
    const child = {
      parent: {
        type: "FRAME",
        layoutMode: "HORIZONTAL",
        counterAxisAlignItems: "MAX",
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
      },
      layoutAlign: "INHERIT",
    };
    const p = extractSectionPlacementFromParent(child as unknown as FrameNode);
    expect(p.align).toBeUndefined();
  });
});

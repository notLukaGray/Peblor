import { describe, expect, it } from "vitest";
import {
  getChildWrapperLayoutStyle,
  getContainerWrapperStyle,
  shouldRenderChildWrapper,
} from "./element-module-style-utils";

describe("element-module-style-utils", () => {
  it("maps responsive align to wrapper alignSelf", () => {
    expect(getChildWrapperLayoutStyle({ align: ["left", "right"] }, true)).toEqual({
      alignSelf: "flex-start",
    });
    expect(getChildWrapperLayoutStyle({ align: ["left", "right"] }, false)).toEqual({
      alignSelf: "flex-end",
    });
  });
  it("returns empty style when align is not left/center/right", () => {
    expect(getChildWrapperLayoutStyle({ align: ["stretch", "stretch"] as never }, true)).toEqual(
      {}
    );
  });

  it("does not render a static wrapper when there is no style override", () => {
    expect(
      shouldRenderChildWrapper({
        hasHandler: false,
        layoutChildren: false,
        style: {},
      })
    ).toBe(false);
  });

  it("keeps wrappers when style, handlers, or layout transitions require them", () => {
    expect(
      shouldRenderChildWrapper({
        hasHandler: false,
        layoutChildren: false,
        style: { background: "#112233" },
      })
    ).toBe(true);
    expect(
      shouldRenderChildWrapper({
        hasHandler: true,
        layoutChildren: false,
        style: {},
      })
    ).toBe(true);
    expect(
      shouldRenderChildWrapper({
        hasHandler: false,
        layoutChildren: true,
        style: {},
      })
    ).toBe(true);
  });

  it("lightens plain hex backgrounds for wrapper layers", () => {
    expect(getContainerWrapperStyle({ background: "#112233" })).toMatchObject({
      background: "#1b2c3d",
    });
  });

  it("keeps non-hex and non-string backgrounds unchanged", () => {
    expect(getContainerWrapperStyle({ background: "linear-gradient(red, blue)" })).toEqual({
      background: "linear-gradient(red, blue)",
    });
    expect(getContainerWrapperStyle({ background: 123 as never })).toEqual({ background: 123 });
  });
});

import { describe, expect, it } from "vitest";
import { buildServerSectionBaseStyle } from "./server-section-style";

describe("buildServerSectionBaseStyle — theme resolution", () => {
  it("emits light-dark() for theme-valued fill, not a baked light value", () => {
    const { resolvedFill } = buildServerSectionBaseStyle(
      { fill: { light: "#aabbcc", dark: "#112233" } } as never,
      false
    );
    expect(resolvedFill).toBe("light-dark(#aabbcc, #112233)");
    expect(resolvedFill).not.toBe("#aabbcc");
  });

  it("emits light-dark() inside border for theme-valued border color", () => {
    const { style } = buildServerSectionBaseStyle(
      {
        border: { width: "1px", style: "solid", color: { light: "#aabbcc", dark: "#112233" } },
      } as never,
      false
    );
    const borderValue = style.border ?? "";
    expect(String(borderValue)).toContain("light-dark(#aabbcc, #112233)");
    expect(String(borderValue)).not.toContain('"#aabbcc"');
  });

  it("emits light-dark() inside wrapperStyle for theme-valued property", () => {
    const { style } = buildServerSectionBaseStyle(
      {
        wrapperStyle: { background: { light: "#aabbcc", dark: "#112233" } },
      } as never,
      false
    );
    expect(style.background).toBe("light-dark(#aabbcc, #112233)");
    expect(style.background).not.toBe("#aabbcc");
  });
});

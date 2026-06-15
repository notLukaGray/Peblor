import { describe, expect, it } from "vitest";
import { computeStateStyle } from "./state-style";

describe("computeStateStyle", () => {
  it("returns undefined className and css when no state styles are provided", () => {
    const result = computeStateStyle({});
    expect(result.className).toBeUndefined();
    expect(result.css).toBeUndefined();
  });

  it("returns undefined when all state style objects are empty", () => {
    const result = computeStateStyle({ hoverStyle: {}, focusStyle: {} });
    expect(result.className).toBeUndefined();
    expect(result.css).toBeUndefined();
  });

  it("generates a deterministic class name from element id", () => {
    const r1 = computeStateStyle({ id: "my-heading", hoverStyle: { opacity: 0.8 } });
    const r2 = computeStateStyle({ id: "my-heading", hoverStyle: { opacity: 0.8 } });
    expect(r1.className).toBe(r2.className);
    expect(r1.className).toBe("pb-st-my-heading");
  });

  it("generates a deterministic class name via hash when no id", () => {
    const r1 = computeStateStyle({ hoverStyle: { opacity: 0.5 } });
    const r2 = computeStateStyle({ hoverStyle: { opacity: 0.5 } });
    expect(r1.className).toBeDefined();
    expect(r1.className).toBe(r2.className);
    expect(r1.className).toMatch(/^pb-st-/);
  });

  it("generates different class names for different style inputs", () => {
    const r1 = computeStateStyle({ hoverStyle: { opacity: 0.5 } });
    const r2 = computeStateStyle({ hoverStyle: { opacity: 0.8 } });
    expect(r1.className).not.toBe(r2.className);
  });

  it("serializes camelCase CSS properties to kebab-case in the output", () => {
    const { css } = computeStateStyle({
      id: "el-1",
      hoverStyle: { backgroundColor: "red", fontSize: "16px" },
    });
    expect(css).toContain("background-color:red");
    expect(css).toContain("font-size:16px");
  });

  it("emits hover rule", () => {
    const { css, className } = computeStateStyle({
      id: "el-2",
      hoverStyle: { opacity: 0.8 },
    });
    expect(css).toBe(`.${className}:hover{opacity:0.8}`);
  });

  it("emits focus rule", () => {
    const { css, className } = computeStateStyle({
      id: "el-3",
      focusStyle: { outline: "2px solid blue" },
    });
    expect(css).toBe(`.${className}:focus{outline:2px solid blue}`);
  });

  it("emits focus-visible rule", () => {
    const { css, className } = computeStateStyle({
      id: "el-4",
      focusVisibleStyle: { outline: "3px solid blue" },
    });
    expect(css).toBe(`.${className}:focus-visible{outline:3px solid blue}`);
  });

  it("emits active rule", () => {
    const { css, className } = computeStateStyle({
      id: "el-5",
      activeStyle: { transform: "scale(0.97)" },
    });
    expect(css).toBe(`.${className}:active{transform:scale(0.97)}`);
  });

  it("emits disabled rules for :disabled and [aria-disabled='true']", () => {
    const { css, className } = computeStateStyle({
      id: "el-6",
      disabledStyle: { opacity: 0.4 },
    });
    expect(css).toContain(`.${className}:disabled{opacity:0.4}`);
    expect(css).toContain(`.${className}[aria-disabled="true"]{opacity:0.4}`);
  });

  it("only emits blocks for provided states", () => {
    const { css } = computeStateStyle({
      id: "el-7",
      hoverStyle: { opacity: 0.8 },
    });
    expect(css).not.toContain(":focus");
    expect(css).not.toContain(":active");
    expect(css).not.toContain(":disabled");
  });

  it("emits all five state blocks when all are provided", () => {
    const { css } = computeStateStyle({
      id: "el-8",
      hoverStyle: { opacity: 0.8 },
      focusStyle: { outline: "1px solid" },
      focusVisibleStyle: { outline: "2px solid" },
      activeStyle: { transform: "scale(0.97)" },
      disabledStyle: { opacity: 0.4 },
    });
    expect(css).toContain(":hover");
    expect(css).toContain(":focus{");
    expect(css).toContain(":focus-visible");
    expect(css).toContain(":active");
    expect(css).toContain(":disabled");
  });

  it("sanitizes special chars in id for safe CSS class name", () => {
    const { className } = computeStateStyle({
      id: "element/with spaces",
      hoverStyle: { opacity: 0.5 },
    });
    expect(className).toMatch(/^pb-st-[a-zA-Z0-9_-]+$/);
  });

  it("neutralizes a value that tries to break out of the scoped rule block", () => {
    const { css } = computeStateStyle({
      id: "evil-1",
      hoverStyle: { color: "red}body{display:none" },
    });
    expect(css).toBeDefined();
    const text = css as string;
    // No <style>-element breakout characters survive.
    expect(text).not.toContain("<");
    expect(text).not.toContain(">");
    expect(text).not.toContain("</style>");
    // Exactly one `{`…`}` pair remains — the intended rule block.
    expect((text.match(/{/g) ?? []).length).toBe(1);
    expect((text.match(/}/g) ?? []).length).toBe(1);
    // The value is collapsed into a single declaration; no stray braces inside.
    expect(text).toContain("color:redbodydisplay:none");
  });

  it("neutralizes a value that tries to break out of the <style> element", () => {
    const { css } = computeStateStyle({
      id: "evil-2",
      hoverStyle: { color: "red</style><script>alert(1)</script>" },
    });
    const text = css as string;
    expect(text).not.toContain("<");
    expect(text).not.toContain(">");
    expect(text).not.toContain("</style>");
    expect(text).not.toContain("<script>");
    expect((text.match(/{/g) ?? []).length).toBe(1);
    expect((text.match(/}/g) ?? []).length).toBe(1);
  });

  it("drops a declaration whose property name sanitizes to empty", () => {
    const { css } = computeStateStyle({
      id: "evil-3",
      // A malicious "property" made only of unsafe chars sanitizes to "".
      hoverStyle: { "}{<>": "red", opacity: 0.5 },
    });
    const text = css as string;
    // The bad declaration is dropped; only the legitimate one remains.
    expect(text).toBe(".pb-st-evil-3:hover{opacity:0.5}");
    expect((text.match(/{/g) ?? []).length).toBe(1);
    expect((text.match(/}/g) ?? []).length).toBe(1);
  });

  it("strips unsafe chars from a property name without breaking out", () => {
    const { css } = computeStateStyle({
      id: "evil-4",
      // Unsafe chars in the property name are stripped, leaving safe letters.
      hoverStyle: { "color}body{x": "red" },
    });
    const text = css as string;
    expect((text.match(/{/g) ?? []).length).toBe(1);
    expect((text.match(/}/g) ?? []).length).toBe(1);
    expect(text).not.toContain("<");
    expect(text).not.toContain(">");
  });

  it("preserves legitimate values with parentheses, commas, and hex intact", () => {
    const { css, className } = computeStateStyle({
      id: "ok-1",
      hoverStyle: {
        backgroundColor: "rgba(0,0,0,.5)",
        color: "#fff",
        transform: "translateY(-2px)",
      },
    });
    const text = css as string;
    expect(text).toContain("background-color:rgba(0,0,0,.5)");
    expect(text).toContain("color:#fff");
    expect(text).toContain("transform:translateY(-2px)");
    expect(text).toBe(
      `.${className}:hover{background-color:rgba(0,0,0,.5);color:#fff;transform:translateY(-2px)}`
    );
  });

  it("preserves CSS custom properties (leading --) intact", () => {
    const { css, className } = computeStateStyle({
      id: "ok-2",
      hoverStyle: { "--pb-accent": "blue" },
    });
    expect(css).toBe(`.${className}:hover{--pb-accent:blue}`);
  });
});

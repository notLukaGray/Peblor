import { describe, expect, it } from "vitest";
import { elementRiveSchema } from "./element-rive-schemas";
import { elementLottieSchema } from "./element-lottie-schemas";
import { elementTabsSchema } from "./element-tabs-schemas";
import { elementDragSchema } from "./element-drag-schemas";
import { elementImageCompareSchema } from "./element-image-compare-schemas";
// B-4: importing element-block-schemas ensures registerElementSchema() is called, which
// populates the shared lazy element ref used by tabs / drag / image-compare to validate
// their nested element children against the full discriminated union.
import "./element-block-schemas";

describe("elementRive schema", () => {
  it("validates a minimal Rive element with CDN asset key src", () => {
    const result = elementRiveSchema.safeParse({
      type: "elementRive",
      src: "animations/intro.riv",
    });
    expect(result.success).toBe(true);
  });

  it("validates a Rive element with layout props and event vocabulary", () => {
    const result = elementRiveSchema.safeParse({
      type: "elementRive",
      src: "animations/hero.riv",
      width: "100%",
      height: "400px",
      align: "center",
      objectFit: "contain",
      aspectRatio: "16/9",
      autoplay: true,
      stateMachine: "main",
      speed: 1.5,
      loop: 3,
      interactivity: [
        { event: "load", input: "isActive", value: true },
        { event: "click", input: "triggerAction", value: "fire" },
      ],
      onPlay: { type: "setVariable", payload: { key: "playing", value: true } },
      onPause: { type: "setVariable", payload: { key: "playing", value: false } },
      onComplete: { type: "navigate", payload: { href: "/done" } },
      onStop: { type: "modalOpen", payload: { id: "finish-modal" } },
      ariaLabel: "Product animation",
    });
    expect(result.success).toBe(true);
  });

  it("validates responsive objectFit tier map", () => {
    const result = elementRiveSchema.safeParse({
      type: "elementRive",
      src: "a.riv",
      objectFit: { base: "contain", md: "cover" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid interactivity event", () => {
    const result = elementRiveSchema.safeParse({
      type: "elementRive",
      src: "a.riv",
      interactivity: [{ event: "unknownEvent", input: "x" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("elementLottie schema", () => {
  it("validates a minimal Lottie element with CDN asset key src", () => {
    const result = elementLottieSchema.safeParse({
      type: "elementLottie",
      src: "animations/loader.json",
    });
    expect(result.success).toBe(true);
  });

  it("validates a Lottie element with layout props and full event vocabulary", () => {
    const result = elementLottieSchema.safeParse({
      type: "elementLottie",
      src: "animations/banner.json",
      width: "100%",
      height: "300px",
      align: "center",
      objectFit: "cover",
      aspectRatio: "2/1",
      autoplay: true,
      loop: true,
      speed: 1,
      direction: -1 as const,
      playMode: "bounce",
      segment: [0, 60],
      renderer: "canvas" as const,
      interactivity: [
        {
          event: "complete",
          action: { type: "setVariable", payload: { key: "done", value: true } },
        },
      ],
      onPlay: { type: "setVariable", payload: { key: "playing", value: true } },
      onPause: { type: "setVariable", payload: { key: "playing", value: false } },
      onStop: { type: "stopSound", payload: { id: "bgm" } },
      onComplete: { type: "navigate", payload: { href: "/done" } },
      ariaLabel: "Loading animation",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid interactivity event in Lottie", () => {
    const result = elementLottieSchema.safeParse({
      type: "elementLottie",
      src: "a.json",
      interactivity: [
        { event: "unknownEvent", action: { type: "navigate", payload: { href: "/" } } },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("elementTabs schema", () => {
  it("validates a minimal tabs element", () => {
    const result = elementTabsSchema.safeParse({
      type: "elementTabs",
      tabs: [{ label: "Tab 1", elements: [{ type: "elementBody", text: "Content" }] }],
    });
    expect(result.success).toBe(true);
  });

  it("validates tabs with spacing/sizing props", () => {
    const result = elementTabsSchema.safeParse({
      type: "elementTabs",
      tabs: [
        { label: "One", elements: [{ type: "elementBody", text: "A" }] },
        { label: "Two", elements: [{ type: "elementBody", text: "B" }] },
      ],
      variant: "pill",
      activeTab: 0,
      tabAlignment: "center",
      tabGap: "1rem",
      tabPadding: "0.5rem 1rem",
      tabMinWidth: "80px",
      contentPadding: "1rem",
      keyboardNav: true,
      ariaLabel: "Settings tabs",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative activeTab (zero-indexed, only non-negative allowed)", () => {
    const result = elementTabsSchema.safeParse({
      type: "elementTabs",
      tabs: [{ label: "Tab", elements: [{ type: "elementBody", text: "Valid" }] }],
      activeTab: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe("elementDrag schema", () => {
  it("validates a minimal drag element", () => {
    const result = elementDragSchema.safeParse({
      type: "elementDrag",
    });
    expect(result.success).toBe(true);
  });

  it("validates a drag element with constraint props", () => {
    const result = elementDragSchema.safeParse({
      type: "elementDrag",
      axis: "x",
      snap: { x: 20 },
      bounds: { left: 0, right: 500 },
      constrainToParent: true,
      snapBack: true,
      snapBackDuration: 400,
      dragThreshold: 5,
      ariaLabel: "Draggable panel",
      children: {
        elementOrder: ["item"],
        definitions: {
          item: { type: "elementBody", text: "Drag me" },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("validates both axis drag with y snap", () => {
    const result = elementDragSchema.safeParse({
      type: "elementDrag",
      axis: "both",
      snap: { x: 10, y: 10 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid axis value", () => {
    const result = elementDragSchema.safeParse({
      type: "elementDrag",
      axis: "z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative drag opacity", () => {
    const result = elementDragSchema.safeParse({
      type: "elementDrag",
      dragOpacity: -0.5,
    });
    expect(result.success).toBe(false);
  });
});

describe("elementImageCompare schema", () => {
  it("validates a minimal image compare element", () => {
    const result = elementImageCompareSchema.safeParse({
      type: "elementImageCompare",
      before: { src: "before.png" },
      after: { src: "after.png" },
    });
    expect(result.success).toBe(true);
  });

  it("validates with aspectRatio field", () => {
    const result = elementImageCompareSchema.safeParse({
      type: "elementImageCompare",
      before: { src: "before.png" },
      after: { src: "after.png" },
      aspectRatio: "4/3",
      direction: "vertical",
      initialPosition: 0.3,
    });
    expect(result.success).toBe(true);
  });

  it("rejects initialPosition > 1", () => {
    const result = elementImageCompareSchema.safeParse({
      type: "elementImageCompare",
      before: { src: "b.png" },
      after: { src: "a.png" },
      initialPosition: 1.5,
    });
    expect(result.success).toBe(false);
  });
});

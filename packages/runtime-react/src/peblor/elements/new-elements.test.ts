import { describe, it, expect } from "vitest";
import { elementBlockSchema } from "@pb/contracts";

const parse = (block: unknown) => elementBlockSchema.safeParse(block);

describe("elementAudio", () => {
  it("parses minimal audio", () => {
    const r = parse({ type: "elementAudio", src: "https://example.com/track.mp3" });
    expect(r.success).toBe(true);
  });

  it("parses audio with all fields", () => {
    const r = parse({
      type: "elementAudio",
      src: "https://example.com/track.mp3",
      sources: [{ src: "https://example.com/track.ogg", type: "audio/ogg" }],
      poster: "https://example.com/cover.jpg",
      autoplay: false,
      loop: true,
      muted: false,
      controls: true,
      playbackRate: 1.5,
      preload: "metadata",
      showWaveform: true,
      showTimeDisplay: true,
      ariaLabel: "Episode 42",
    });
    expect(r.success).toBe(true);
  });
});

describe("elementCounter", () => {
  it("parses minimal counter", () => {
    const r = parse({ type: "elementCounter", target: 100, tween: { duration: 1000 } });
    expect(r.success).toBe(true);
  });

  it("parses counter with formatting", () => {
    const r = parse({
      type: "elementCounter",
      target: 1500,
      start: 0,
      tween: { duration: 2500 },
      prefix: "",
      suffix: "+",
      decimals: 0,
      separator: true,
      trigger: "onVisible",
      level: 1,
      color: "var(--color-primary)",
    });
    expect(r.success).toBe(true);
  });

  it("parses counter with scroll trigger", () => {
    const r = parse({
      type: "elementCounter",
      target: 500,
      trigger: "onScroll",
      scroll: { scrollStart: 0.2, scrollEnd: 0.8 },
    });
    expect(r.success).toBe(true);
  });

  it("requires variableTween when variableKey is set", () => {
    const r = parse({
      type: "elementCounter",
      target: 10,
      variableKey: "score",
      tween: { duration: 500 },
    });
    expect(r.success).toBe(false);
  });

  it("parses variable-bound counter", () => {
    const r = parse({
      type: "elementCounter",
      target: 10,
      variableKey: "score",
      variableTween: { duration: 400, easing: "easeOut" },
    });
    expect(r.success).toBe(true);
  });

  it("parses scroll counter with variableKey without variableTween", () => {
    const r = parse({
      type: "elementCounter",
      target: 100,
      variableKey: "progress",
      trigger: "onScroll",
      scroll: { scrollStart: 0, scrollEnd: 1 },
    });
    expect(r.success).toBe(true);
  });
});

describe("elementMarquee", () => {
  it("parses minimal marquee", () => {
    const r = parse({ type: "elementMarquee", text: "Breaking news — scrolls infinitely" });
    expect(r.success).toBe(true);
  });

  it("parses marquee with gradient edges", () => {
    const r = parse({
      type: "elementMarquee",
      text: "Free shipping on orders over $50",
      direction: "left",
      speed: 10,
      gap: "32px",
      pauseOnHover: true,
      gradientEdges: true,
      gradientWidth: "64px",
      level: 2,
    });
    expect(r.success).toBe(true);
  });

  it("parses marquee with motion path", () => {
    const r = parse({
      type: "elementMarquee",
      text: "On a curve",
      followPath: { d: "M 0 40 Q 200 0 400 40", height: "5rem", offsetRotate: "0deg" },
      speed: 12,
    });
    expect(r.success).toBe(true);
  });

  it("parses marquee with body variant", () => {
    const r = parse({
      type: "elementMarquee",
      text: "Label strip",
      variant: "label",
      speed: 14,
    });
    expect(r.success).toBe(true);
  });
});

describe("elementImageCompare", () => {
  it("parses minimal compare", () => {
    const r = parse({
      type: "elementImageCompare",
      before: { src: "https://example.com/before.jpg" },
      after: { src: "https://example.com/after.jpg" },
    });
    expect(r.success).toBe(true);
  });

  it("parses compare with labels and handle", () => {
    const r = parse({
      type: "elementImageCompare",
      before: { src: "https://example.com/before.jpg", alt: "Before" },
      after: { src: "https://example.com/after.jpg", alt: "After" },
      initialPosition: 0.3,
      direction: "vertical",
      beforeLabel: "Original",
      afterLabel: "Retouched",
      labelPosition: "overlay",
      hoverActivate: true,
      handleSize: "48px",
      handleColor: "var(--color-accent)",
      handleIcon: "chevron",
      dividerColor: "rgba(255,255,255,0.5)",
      dividerWidth: "3px",
      ariaLabel: "Before and after comparison",
    });
    expect(r.success).toBe(true);
  });
});

describe("elementTabs", () => {
  it("parses minimal tabs", () => {
    const r = parse({
      type: "elementTabs",
      tabs: [
        { label: "Tab 1", elements: [] },
        { label: "Tab 2", elements: [] },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("parses tabs with all options", () => {
    const r = parse({
      type: "elementTabs",
      tabs: [
        { label: "Design", icon: "paintbrush", elements: [] },
        { label: "Code", badge: 3, elements: [] },
        { label: "Disabled", disabled: true, elements: [] },
      ],
      variant: "pill",
      activeTab: 0,
      tabAlignment: "center",
      contentAnimation: "fade",
      lazyLoad: true,
      scrollable: true,
      mobileCollapse: true,
      keyboardNav: true,
    });
    expect(r.success).toBe(true);
  });
});

describe("elementTooltip", () => {
  it("parses minimal tooltip", () => {
    const r = parse({ type: "elementTooltip", content: "Helpful hint" });
    expect(r.success).toBe(true);
  });

  it("parses tooltip with all options", () => {
    const r = parse({
      type: "elementTooltip",
      content: "Click to learn more",
      position: "bottom",
      trigger: "click",
      showDelay: 500,
      hideDelay: 100,
      offset: "12px",
      arrow: true,
      interactive: true,
      followCursor: false,
      maxWidth: "300px",
      zIndex: 100,
      animation: "scale",
      color: "var(--color-inverse)",
      fontSize: "12px",
    });
    expect(r.success).toBe(true);
  });
});

describe("elementLottie", () => {
  it("parses minimal lottie", () => {
    const r = parse({ type: "elementLottie", src: "https://example.com/animation.json" });
    expect(r.success).toBe(true);
  });

  it("parses lottie with all options", () => {
    const r = parse({
      type: "elementLottie",
      src: "https://example.com/animation.json",
      poster: "https://example.com/poster.jpg",
      autoplay: true,
      loop: 3,
      speed: 1.5,
      direction: -1,
      playMode: "bounce",
      segment: [0, 60],
      renderer: "canvas",
      backgroundColor: "var(--color-surface)",
      preserveAspectRatio: "xMidYMid slice",
      hover: true,
      interactivity: [
        { event: "complete", action: { type: "modalOpen", payload: { id: "detail" } } },
      ],
      themeOverrides: { primary: "var(--color-accent)" },
      onComplete: { type: "setVariable", payload: { key: "done", value: true } },
      ariaLabel: "Loading spinner",
    });
    expect(r.success).toBe(true);
  });
});

describe("elementFormField", () => {
  it("parses text field", () => {
    const r = parse({
      type: "elementFormField",
      field: { type: "formField", fieldType: "text", label: "Name", name: "name" },
    });
    expect(r.success).toBe(true);
  });

  it("parses select field with options", () => {
    const r = parse({
      type: "elementFormField",
      field: {
        type: "formField",
        fieldType: "select",
        label: "Country",
        name: "country",
        options: [
          { value: "us", label: "United States" },
          { value: "ca", label: "Canada" },
        ],
      },
    });
    expect(r.success).toBe(true);
  });

  it("parses date field", () => {
    const r = parse({
      type: "elementFormField",
      field: {
        type: "formField",
        fieldType: "date",
        label: "Event date",
        placeholder: "YYYY-MM-DD",
      },
    });
    expect(r.success).toBe(true);
  });
});

describe("elementRive (extended)", () => {
  it("parses minimal rive", () => {
    const r = parse({ type: "elementRive", src: "https://example.com/anim.riv" });
    expect(r.success).toBe(true);
  });

  it("parses rive with new fields", () => {
    const r = parse({
      type: "elementRive",
      src: "https://example.com/anim.riv",
      poster: "https://example.com/poster.jpg",
      loop: 3,
      speed: 1.5,
      playMode: "bounce",
      backgroundColor: "var(--color-surface)",
      preserveAspectRatio: "xMidYMid meet",
      hover: true,
      interactivity: [{ event: "click", input: "togglePlay", value: true }],
      onComplete: { type: "setVariable", payload: { key: "animDone", value: true } },
      onStop: { type: "modalClose", payload: { id: "player" } },
    });
    expect(r.success).toBe(true);
  });
});

describe("schema validation edge cases", () => {
  it("rejects unknown element type", () => {
    const r = parse({ type: "elementFake", fake: true });
    expect(r.success).toBe(false);
  });

  it("rejects audio without src", () => {
    const r = parse({ type: "elementAudio" });
    expect(r.success).toBe(false);
  });

  it("rejects onVisible counter without tween", () => {
    const r = parse({ type: "elementCounter", target: 100, trigger: "onVisible" });
    expect(r.success).toBe(false);
  });

  it("rejects counter without target", () => {
    const r = parse({ type: "elementCounter" });
    expect(r.success).toBe(false);
  });

  it("rejects imageCompare without before/after", () => {
    const r = parse({ type: "elementImageCompare" });
    expect(r.success).toBe(false);
  });

  it("allows tabs with empty array (dynamic population)", () => {
    const r = parse({ type: "elementTabs", tabs: [] });
    expect(r.success).toBe(true);
  });
});

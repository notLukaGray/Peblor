import { describe, expect, it } from "vitest";
import { parseSectionTriggerProps } from "./section-triggers";

describe("section trigger annotations", () => {
  it("parses scrollSpeed from section annotations", () => {
    const props = parseSectionTriggerProps({
      scrollspeed: "0.6",
    });

    expect(props).toMatchObject({
      scrollSpeed: 0.6,
    });
  });

  it("ignores invalid scrollSpeed values", () => {
    const props = parseSectionTriggerProps({
      scrollspeed: "fast",
    });

    expect(props).not.toHaveProperty("scrollSpeed");
  });

  it("parses sticky family and scalar props together", () => {
    const props = parseSectionTriggerProps({
      sticky: "true",
      stickyoffset: "12px",
      stickyposition: "bottom",
      triggeronce: "true",
      threshold: "0.3",
    });
    expect(props).toMatchObject({
      sticky: true,
      stickyOffset: "12px",
      stickyPosition: "bottom",
      triggerOnce: true,
      threshold: 0.3,
    });
  });

  it("parses visibleWhen with typed value", () => {
    const props = parseSectionTriggerProps({
      visiblewhen: "progress:gte:0.5",
    });
    expect(props.visibleWhen).toEqual({
      variable: "progress",
      operator: "gte",
      value: 0.5,
    });
  });
});

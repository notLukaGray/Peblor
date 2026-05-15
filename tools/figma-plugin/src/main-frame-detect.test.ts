import { describe, expect, it } from "vitest";
import { parseTargetOverride } from "./main-frame-detect";

describe("parseTargetOverride", () => {
  it("keeps slash-name key semantics aligned with detectExportTarget", () => {
    const frame = { name: "Section/Hero Banner" } as FrameNode;
    const target = parseTargetOverride("modal", frame);

    expect(target).toMatchObject({
      type: "modal",
      key: "hero-banner",
      label: "Hero Banner",
    });
  });

  it("falls back to whole frame name when no slash exists", () => {
    const frame = { name: "Landing Hero" } as FrameNode;
    const target = parseTargetOverride("page", frame);

    expect(target).toMatchObject({
      type: "page",
      key: "landing-hero",
      label: "Landing Hero",
    });
  });

  it("strips annotations and resolves override type case-insensitively", () => {
    const frame = { name: "Section/Hero Banner [pb: hidden=true]" } as FrameNode;
    const target = parseTargetOverride("BUTTON", frame);
    expect(target).toMatchObject({
      type: "global-button",
      key: "hero-banner",
      label: "Hero Banner",
    });
  });

  it("falls back to page when override value is unknown", () => {
    const frame = { name: "Modal/Quick View" } as FrameNode;
    const target = parseTargetOverride("mystery", frame);
    expect(target.type).toBe("page");
  });
});

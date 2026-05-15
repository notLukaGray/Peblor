import { describe, expect, it } from "vitest";
import { buildAssetKey } from "./asset-key";

function makeCtx(cdnPrefix = ""): {
  usedAssetKeys: Set<string>;
  cdnPrefix: string;
} {
  return {
    usedAssetKeys: new Set<string>(),
    cdnPrefix,
  };
}

describe("buildAssetKey", () => {
  it("drops path traversal segments from raw names", () => {
    const ctx = makeCtx();
    const key = buildAssetKey("../secret/../../hero image", ctx as never);

    expect(key.cdnKey).toBe("hero-image.png");
    expect(key.filename).toBe("assets/hero-image.png");
  });

  it("normalizes traversal segments from cdnPrefix and keeps zip filename safe", () => {
    const ctx = makeCtx("../unsafe/../project/");
    const key = buildAssetKey("../../banner", ctx as never, ".webp");

    expect(key.cdnKey).toBe("project/banner.webp");
    expect(key.filename).toBe("assets/project/banner.webp");
    expect(key.filename).not.toContain("..");
  });

  it("still dedupes collisions after sanitization", () => {
    const ctx = makeCtx();
    const first = buildAssetKey("Hero", ctx as never);
    const second = buildAssetKey("./Hero", ctx as never);

    expect(first.cdnKey).toBe("hero.png");
    expect(second.cdnKey).toBe("hero-2.png");
    expect(second.filename).toBe("assets/hero-2.png");
  });
});

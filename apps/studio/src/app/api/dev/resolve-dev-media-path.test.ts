import path from "path";
import { describe, expect, it } from "vitest";
import { resolveDevMediaPath } from "./resolve-dev-media-path";

// Must match the PROJECT_ROOT computation in the source file.
// __dirname is apps/studio/src/app/api/dev at test time.
const PROJECT_ROOT = path.resolve(__dirname, "../../../../../..");
const MEDIA_ROOT = path.resolve(PROJECT_ROOT, "media");
const CONTENT_ROOT = path.resolve(PROJECT_ROOT, "content");

describe("resolveDevMediaPath", () => {
  it.each([
    MEDIA_ROOT,
    path.join(MEDIA_ROOT, "videos/clip.mp4"),
    CONTENT_ROOT,
    path.join(CONTENT_ROOT, "pages/work/demo/index.json"),
  ])("allows in-root path: %s", (value) => {
    expect(resolveDevMediaPath(value)).toBe(path.normalize(value));
  });

  it.each([
    "",
    "relative/path.mp4",
    "../escape.mp4",
    path.resolve("/tmp"),
    `${MEDIA_ROOT}-other/file.mp4`,
  ])("rejects out-of-root path: %s", (value) => {
    expect(resolveDevMediaPath(value)).toBeNull();
  });
});

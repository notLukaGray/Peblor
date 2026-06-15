import { describe, expect, it } from "vitest";
import bunnyImageLoader from "./next-image-loader";

describe("bunnyImageLoader", () => {
  it("rewrites media aliases with width params per requested size", () => {
    const out = bunnyImageLoader({
      src: "/api/media/work/hero.webp?width=800&quality=75&format=webp",
      width: 1200,
    });

    expect(out).toBe("/api/media/work/hero.webp?width=1200&quality=75&format=auto");
  });

  it("keeps class-based media aliases immutable", () => {
    const out = bunnyImageLoader({
      src: "/api/media/work/hero.webp?class=hero&format=webp",
      width: 1200,
    });

    expect(out).toBe("/api/media/work/hero.webp?class=hero&format=webp#w=1200");
  });
});

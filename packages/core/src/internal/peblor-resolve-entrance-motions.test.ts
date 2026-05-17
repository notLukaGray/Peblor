import { describe, expect, it } from "vitest";
import { resolveEntranceMotion } from "./peblor-resolve-entrance-motions";

describe("resolveEntranceMotion", () => {
  it("keeps loop transition fields from entranceMotion", () => {
    const resolved = resolveEntranceMotion({
      trigger: "onMount",
      entranceMotion: {
        initial: { rotate: 0 },
        animate: { rotate: [0, 12, -12, 0] },
        transition: {
          duration: 2,
          ease: "linear",
          repeat: 999,
          repeatType: "loop",
          repeatDelay: 0.2,
        },
      },
    });

    expect(resolved).toBeTruthy();
    expect(resolved?.transition).toMatchObject({
      duration: 2,
      repeat: 999,
      repeatType: "loop",
      repeatDelay: 0.2,
    });
  });
});

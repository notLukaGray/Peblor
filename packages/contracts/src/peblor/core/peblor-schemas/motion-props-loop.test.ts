import { describe, expect, it } from "vitest";
import { motionPropsSchema, motionTimingSchema } from "./motion-props-schema";

describe("motion loop transition fields", () => {
  it("accepts repeat fields on motion.transition", () => {
    const result = motionPropsSchema.safeParse({
      animate: { rotate: [0, 10, -10, 0] },
      transition: {
        duration: 2,
        ease: "linear",
        repeat: 999,
        repeatType: "loop",
        repeatDelay: 0.1,
        times: [0, 0.33, 0.66, 1],
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.transition?.repeat).toBe(999);
      expect(result.data?.transition?.repeatType).toBe("loop");
    }
  });

  it("accepts repeat fields on motionTiming.entranceMotion.transition", () => {
    const result = motionTimingSchema.safeParse({
      trigger: "onMount",
      entranceMotion: {
        initial: { opacity: 0 },
        animate: { opacity: 1, y: [12, 0, 12] },
        transition: {
          duration: 1.6,
          repeat: 99,
          repeatType: "reverse",
          repeatDelay: 0.05,
        },
      },
    });
    expect(result.success).toBe(true);
  });
});

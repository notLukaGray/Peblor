import type { z } from "zod";
import type {
  bgLoopMotionSchema,
  bgEntranceMotionSchema,
  bgScrollMotionSchema,
  bgPointerMotionSchema,
  bgParallaxMotionSchema,
  bgTriggerMotionSchema,
  bgLayerMotionSchema,
} from "./bg-layer-motion-schema";

export type BgLoopMotion = z.infer<typeof bgLoopMotionSchema>;
export type BgEntranceMotion = z.infer<typeof bgEntranceMotionSchema>;
export type BgScrollMotion = z.infer<typeof bgScrollMotionSchema>;
export type BgPointerMotion = z.infer<typeof bgPointerMotionSchema>;
export type BgParallaxMotion = z.infer<typeof bgParallaxMotionSchema>;
export type BgTriggerMotion = z.infer<typeof bgTriggerMotionSchema>;
export type BgLayerMotion = z.infer<typeof bgLayerMotionSchema>;

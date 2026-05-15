import { z } from "zod";
import { elementLayoutSchema } from "./element-foundation-schemas";

export const elementAudioSchema = z
  .object({
    type: z.literal("elementAudio"),
    src: z.string(),
    sources: z
      .array(
        z.object({
          src: z.string(),
          type: z.string().optional(),
        })
      )
      .optional(),
    poster: z.string().optional(),
    autoplay: z.boolean().optional(),
    loop: z.boolean().optional(),
    muted: z.boolean().optional(),
    controls: z.boolean().optional(),
    playbackRate: z.number().positive().optional(),
    preload: z.enum(["none", "metadata", "auto"]).optional(),
    showWaveform: z.boolean().optional(),
    showTimeDisplay: z.boolean().optional(),
    module: z.string().optional(),
    ariaLabel: z.string().optional(),
  })
  .merge(elementLayoutSchema);

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
    /** Visualization style for the waveform canvas. Default "bars". */
    waveformMode: z.enum(["bars", "wave", "mirror", "spectrum"]).optional(),
    showTimeDisplay: z.boolean().optional(),
    /** Override the module container's aspect ratio per-instance. Pass null to use only minHeight. */
    containerAspectRatio: z.string().nullish(),
    module: z.string().optional(),
    ariaLabel: z.string().optional(),
  })
  .merge(elementLayoutSchema);

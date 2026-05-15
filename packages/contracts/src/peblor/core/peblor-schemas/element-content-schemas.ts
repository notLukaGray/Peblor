import { z } from "zod";
import {
  cssInlineStyleSchema,
  jsonNullishOptional,
  referrerPolicySchema,
  responsiveStringSchema,
  themeStringSchema,
  triggerActionSchema,
} from "./schema-primitives";
import {
  buttonActionSchema,
  elementButtonSchema,
  parseButtonAction,
  type ButtonAction,
} from "./element-button-schemas";
import {
  elementGraphicLinkSchema,
  elementLayoutSchema,
  elementSimpleLinkSchema,
  responsiveElementBodyVariantSchema,
  responsiveImageObjectFitSchema,
  responsiveVideoObjectFitSchema,
  vectorColorsSchema,
  vectorGradientSchema,
  vectorShapeSchema,
} from "./element-foundation-schemas";
import { elementRangeSchema } from "./element-range-schemas";
import { elementInputSchema } from "./element-input-schemas";

const headingLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

const textFillSchema = z.union([
  z.object({ type: z.literal("color"), value: themeStringSchema }),
  z.object({ type: z.literal("gradient"), value: themeStringSchema }),
]);

const elementHeadingSchema = z
  .object({
    type: z.literal("elementHeading"),
    /** Preset key for `pbBuilderDefaultsV1.elements.heading` variant templates. */
    variant: jsonNullishOptional(z.enum(["display", "section", "label"])),
    level: jsonNullishOptional(headingLevelSchema),
    /** Optional semantic heading level (h1–h6) for document outline. When set, used for the element tag; `level` still drives typography style. Use to fix heading order (e.g. level 4 style with semanticLevel 2 for correct outline). */
    semanticLevel: jsonNullishOptional(headingLevelSchema),
    text: z.string(),
    wordWrap: jsonNullishOptional(z.boolean()),
    letterSpacing: jsonNullishOptional(z.union([z.string(), z.number()])),
    lineSpacing: jsonNullishOptional(z.union([z.string(), z.number()])),
    lineHeight: jsonNullishOptional(z.union([z.string(), z.number()])),
    color: jsonNullishOptional(themeStringSchema),
    textFill: jsonNullishOptional(textFillSchema),
    /** When set, renders the variable value from the store instead of static `text`. */
    variableKey: jsonNullishOptional(z.string()),
    /**
     * Font family override. Use a named slot to follow the active typeface:
     * `"primary"` | `"secondary"` | `"mono"`.
     * Any other string is passed through as a raw CSS font-family value.
     */
    fontFamily: jsonNullishOptional(z.string()),
    fontSize: jsonNullishOptional(z.union([z.string(), z.number()])),
    fontWeight: jsonNullishOptional(z.union([z.string(), z.number()])),
    fontFeatureSettings: jsonNullishOptional(z.string()),
    textOverflow: jsonNullishOptional(z.string()),
    textStroke: jsonNullishOptional(z.string()),
    verticalAlign: jsonNullishOptional(z.string()),
    paragraphSpacing: jsonNullishOptional(z.union([z.string(), z.number()])),
    maxLines: jsonNullishOptional(z.number().int().positive()),
  })
  .merge(elementLayoutSchema);

const elementBodySchema = z
  .object({
    type: z.literal("elementBody"),
    /** Preset key for `pbBuilderDefaultsV1.elements.body` variant templates. */
    variant: jsonNullishOptional(z.enum(["lead", "standard", "fine"])),
    text: z.string(),
    level: responsiveElementBodyVariantSchema.optional(),
    wordWrap: z.boolean().optional(),
    letterSpacing: z.union([z.string(), z.number()]).optional(),
    lineSpacing: z.union([z.string(), z.number()]).optional(),
    /** When set, renders the variable value from the store instead of static `text`. */
    variableKey: z.string().optional(),
    /**
     * When true and this body sits under `elementAudio` transport context, `text` is ignored and
     * the label shows live current time / duration (e.g. module chrome).
     */
    bindAudioTransportTime: z.literal(true).optional(),
    /**
     * Font family override. Use a named slot to follow the active typeface:
     * `"primary"` | `"secondary"` | `"mono"`.
     * Any other string is passed through as a raw CSS font-family value.
     */
    fontFamily: z.string().optional(),
    fontSize: z.union([z.string(), z.number()]).optional(),
    fontWeight: z.union([z.string(), z.number()]).optional(),
    lineHeight: z.union([z.string(), z.number()]).optional(),
    /** Direct text color override. Takes precedence over typography class color. */
    color: themeStringSchema.optional(),
    textFill: textFillSchema.optional(),
    fontFeatureSettings: z.string().optional(),
    textOverflow: z.string().optional(),
    textStroke: z.string().optional(),
    verticalAlign: z.string().optional(),
    paragraphSpacing: z.union([z.string(), z.number()]).optional(),
    maxLines: z.number().int().positive().optional(),
  })
  .merge(elementLayoutSchema);

const elementLinkSchema = z
  .object({
    type: z.literal("elementLink"),
    /** Preset key for `pbBuilderDefaultsV1.elements.link` variant templates. */
    variant: jsonNullishOptional(z.enum(["inline", "emphasis", "nav"])),
    label: z.string(),
    href: z.string(),
    external: z.boolean().optional(),
    target: z.enum(["_self", "_blank", "_parent", "_top"]).optional(),
    rel: z.string().optional(),
    download: z.union([z.boolean(), z.string()]).optional(),
    hreflang: z.string().optional(),
    ping: z.string().optional(),
    referrerPolicy: referrerPolicySchema.optional(),
    copyType: z.enum(["heading", "body"]),
    level: responsiveElementBodyVariantSchema.optional(),
    wordWrap: z.boolean().optional(),
    linkDefault: themeStringSchema.optional(),
    linkHover: themeStringSchema.optional(),
    linkActive: themeStringSchema.optional(),
    linkDisabled: themeStringSchema.optional(),
    linkTransition: z.union([z.string(), z.number()]).optional(),
    disabled: z.boolean().optional(),
    /**
     * Font family override. Use a named slot to follow the active typeface:
     * `"primary"` | `"secondary"` | `"mono"`.
     * Any other string is passed through as a raw CSS font-family value.
     */
    fontFamily: z.string().optional(),
    fontSize: z.union([z.string(), z.number()]).optional(),
    fontWeight: z.union([z.string(), z.number()]).optional(),
    fontFeatureSettings: z.string().optional(),
    textOverflow: z.string().optional(),
    textStroke: z.string().optional(),
    verticalAlign: z.string().optional(),
    paragraphSpacing: z.union([z.string(), z.number()]).optional(),
  })
  .merge(elementLayoutSchema)
  .refine(
    (data) => {
      if (data.copyType === "heading") return data.level !== undefined;
      return true;
    },
    { message: "level is required when copyType is 'heading'", path: ["level"] }
  );

const elementImageSchema = z
  .object({
    type: z.literal("elementImage"),
    /** Optional image variant key. Runtime defaults can map this to fit/aspect/animation behavior. */
    variant: jsonNullishOptional(z.enum(["hero", "inline", "fullCover", "feature", "crop"])),
    src: z.string(),
    alt: z.string(),
    objectFit: responsiveImageObjectFitSchema,
    objectPosition: z.string().optional(),
    rotate: z.union([z.number(), z.string()]).optional(),
    flipHorizontal: z.boolean().optional(),
    flipVertical: z.boolean().optional(),
    link: elementSimpleLinkSchema.optional(),
    aspectRatio: responsiveStringSchema.optional(),
    imageRotation: z.number().optional(),
    imageCrop: z
      .object({
        x: z.number().optional(),
        y: z.number().optional(),
        scale: z.number().optional(),
        /** Normalized 0–1 in the media frame; metadata only (does not move the image). */
        focalX: z.number().min(0).max(1).optional(),
        focalY: z.number().min(0).max(1).optional(),
      })
      .optional(),
    imageFilters: z
      .object({
        brightness: z.number().optional(),
        contrast: z.number().optional(),
        saturate: z.number().optional(),
        blur: z.number().optional(),
        grayscale: z.number().optional(),
        sepia: z.number().optional(),
        hueRotate: z.number().optional(),
        invert: z.number().optional(),
      })
      .optional(),
    fillOpacity: z.number().min(0).max(1).optional(),
    /** Hint browser when to load the image. "lazy" defers off-screen images; "eager" loads immediately. */
    loading: z.enum(["lazy", "eager"]).optional(),
    /** Browser image decode hint. "async" avoids blocking the main thread. */
    decoding: z.enum(["async", "sync", "auto"]).optional(),
    /** Raw srcset string for responsive images (e.g. "img-480.jpg 480w, img-800.jpg 800w"). */
    srcSet: z.string().optional(),
    /** Sizes attribute paired with srcSet (e.g. "(max-width: 600px) 480px, 800px"). */
    sizes: z.string().optional(),
  })
  .merge(elementLayoutSchema);

const elementVideoSchema = z
  .object({
    type: z.literal("elementVideo"),
    /** Preset key for `pbBuilderDefaultsV1.elements.video` variant templates. */
    variant: jsonNullishOptional(z.enum(["inline", "compact", "fullcover", "hero"])),
    src: z.string(),
    /** Ordered playback sources. Runtime tries the first supported source and falls back downward. */
    sources: z
      .array(
        z.object({
          src: z.string(),
          type: z.string().optional(),
          label: z.string().optional(),
        })
      )
      .optional(),
    /** Poster (Bunny asset key or resolved URL). Required. */
    poster: z.string(),
    ariaLabel: z.string().optional(),
    /** When true the video is treated as presentational/decorative — no controls, autoplay, muted implied. ariaLabel is required when false or absent. */
    decorative: z.boolean().optional(),
    autoplay: z.boolean().optional(),
    loop: z.boolean().optional(),
    muted: z.boolean().optional(),
    playbackRate: z.number().positive().optional(),
    objectFit: responsiveVideoObjectFitSchema,
    objectPosition: z.string().optional(),
    rotate: z.union([z.number(), z.string()]).optional(),
    flipHorizontal: z.boolean().optional(),
    flipVertical: z.boolean().optional(),
    showPlayButton: z.boolean().optional(),
    link: elementSimpleLinkSchema.optional(),
    aspectRatio: responsiveStringSchema.optional(),
    module: z.string().optional(),
    /** Action to fire when video starts playing. */
    onVideoPlay: triggerActionSchema.optional(),
    /** Action to fire when video is paused. */
    onVideoPause: triggerActionSchema.optional(),
    /** Action to fire when video ends. */
    onVideoEnd: triggerActionSchema.optional(),
    /**
     * Fine-grained control over adaptive streaming behaviour (HLS / DASH).
     * All fields are optional — omitting them applies sensible defaults that
     * defer segment loading until the user first presses play.
     */
    streamingConfig: z
      .object({
        /**
         * Whether to start fetching video segments immediately on mount.
         * Default: false — segments are deferred until the user presses play,
         * saving bandwidth for above-the-fold videos that may never be watched.
         * Set to true only when instant-play latency matters more than network cost
         * (e.g. autoplay heroes, background loops).
         */
        autoStartLoad: z.boolean().optional(),
        /** Maximum seconds of video to buffer ahead once playback starts (HLS). Default: 20. */
        maxBufferLength: z.number().positive().optional(),
        /** Maximum buffer size in bytes once playback starts (HLS). Default: 10 MB. */
        maxBufferSize: z.number().positive().optional(),
        /** Default buffer target in seconds (DASH). Default: 12. */
        bufferTimeDefault: z.number().positive().optional(),
        /** Buffer target at top quality in seconds (DASH). Default: 20. */
        bufferTimeAtTopQuality: z.number().positive().optional(),
      })
      .optional(),
    /** HTML preload hint for non-streaming sources. "none" saves bandwidth; "metadata" fetches duration/dimensions only. */
    preload: z.enum(["none", "metadata", "auto"]).optional(),
    /** CORS mode for the video element. Required when fetching from a different origin. */
    crossOrigin: z.enum(["anonymous", "use-credentials"]).optional(),
    /** Space-separated list of controls to disable (e.g. "nodownload nofullscreen noremoteplayback"). */
    controlsList: z.string().optional(),
  })
  .merge(elementLayoutSchema);

const elementVectorSchema = z
  .object({
    type: z.literal("elementVector"),
    viewBox: z.string(),
    ariaLabel: z.string().optional(),
    preserveAspectRatio: z.string().optional(),
    shapes: z.array(vectorShapeSchema),
    colors: vectorColorsSchema,
    gradients: z.array(vectorGradientSchema).optional(),
    strokeGroup: z
      .object({
        stroke: themeStringSchema,
        strokeWidth: z.number().optional(),
        strokeLinejoin: z.enum(["miter", "round", "bevel"]).optional(),
        strokeMiterlimit: z.number().optional(),
        opacity: z.number().optional(),
        blendMode: z.string().optional(),
      })
      .optional(),
    rotate: z.union([z.number(), z.string()]).optional(),
    flipHorizontal: z.boolean().optional(),
    flipVertical: z.boolean().optional(),
    link: elementGraphicLinkSchema.optional(),
  })
  .merge(elementLayoutSchema);

const elementSVGSchema = z
  .object({
    type: z.literal("elementSVG"),
    markup: z.string(),
    ariaLabel: z.string().optional(),
    rotate: z.union([z.number(), z.string()]).optional(),
    flipHorizontal: z.boolean().optional(),
    flipVertical: z.boolean().optional(),
    link: elementGraphicLinkSchema.optional(),
  })
  .merge(elementLayoutSchema);

const elementRichTextSchema = z
  .object({
    type: z.literal("elementRichText"),
    content: z.string(),
    markup: z.string().optional(),
    level: responsiveElementBodyVariantSchema.optional(),
    wordWrap: z.boolean().optional(),
  })
  .merge(elementLayoutSchema);

const elementVideoTimeSchema = z
  .object({
    type: z.literal("elementVideoTime"),
    format: z.string().optional(),
    level: responsiveElementBodyVariantSchema.optional(),
    wordWrap: z.boolean().optional(),
    style: cssInlineStyleSchema.optional(),
  })
  .merge(elementLayoutSchema);

const elementVideoQualitySelectSchema = z
  .object({
    type: z.literal("elementVideoQualitySelect"),
    icon: elementVectorSchema.optional(),
    style: cssInlineStyleSchema.optional(),
  })
  .merge(elementLayoutSchema);

const elementSpacerSchema = z
  .object({
    type: z.literal("elementSpacer"),
    /** Preset key for `pbBuilderDefaultsV1.elements.spacer` variant templates. */
    variant: jsonNullishOptional(z.enum(["sm", "md", "lg"])),
  })
  .merge(elementLayoutSchema);

const elementDividerSchema = z
  .object({
    type: z.literal("elementDivider"),
    orientation: z.enum(["horizontal", "vertical"]).optional(),
    thickness: z.string().optional(),
    color: themeStringSchema.optional(),
    style: z.enum(["solid", "dashed", "dotted"]).optional(),
    length: responsiveStringSchema.optional(),
  })
  .merge(elementLayoutSchema);

/** Scroll progress bar element. Tracks parent section scroll (0→1) via SectionScrollTargetContext. */
const elementScrollProgressBarSchema = z
  .object({
    type: z.literal("elementScrollProgressBar"),
    /** Bar height in CSS; when omitted uses motion-defaults progressBar. */
    height: z.string().optional(),
    /** Bar fill color; when omitted uses motion-defaults progressBar. */
    fill: themeStringSchema.optional(),
    /** Track background; when omitted uses motion-defaults progressBar. */
    trackBackground: themeStringSchema.optional(),
    /** useScroll offset; e.g. ["start end", "end start"]. */
    offset: z.tuple([z.string(), z.string()]).optional(),
  })
  .merge(elementLayoutSchema);

export { buttonActionSchema, parseButtonAction };
export type { ButtonAction };

export {
  elementBodySchema,
  elementButtonSchema,
  elementHeadingSchema,
  elementImageSchema,
  elementLinkSchema,
  elementRangeSchema,
  elementInputSchema,
  elementRichTextSchema,
  elementSVGSchema,
  elementSpacerSchema,
  elementDividerSchema,
  elementScrollProgressBarSchema,
  elementVectorSchema,
  elementVideoSchema,
  elementVideoTimeSchema,
  elementVideoQualitySelectSchema,
};

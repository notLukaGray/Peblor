import { z } from "zod";
import {
  cssInlineStyleSchema,
  jsonNullishOptional,
  referrerPolicySchema,
  responsiveStringSchema,
  themeStringSchema,
  triggerActionSchemaCore,
  variantWithAliases,
} from "./schema-primitives";
import {
  headingLevelSchema,
  textFillBaseSchema,
  typographyOverridesSchema,
} from "./schema-shared-primitives";
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

const textFillSchema = z.union([
  ...textFillBaseSchema.options,
  z.object({ type: z.literal("image"), value: z.string() }),
]);

const HEADING_VARIANT_ALIASES = {
  headline: "display",
  title: "display",
  subheading: "section",
  subhead: "section",
  eyebrow: "label",
  overline: "label",
} as const;

const IMAGE_VARIANT_ALIASES = {
  cover: "fullCover",
  full: "fullCover",
  fullscreen: "fullCover",
  fullbleed: "fullCover",
  featured: "feature",
  cropped: "crop",
} as const;

const LINK_VARIANT_ALIASES = {
  primary: "inline",
  cta: "emphasis",
  navigation: "nav",
  navbar: "nav",
  menu: "nav",
} as const;

const VIDEO_VARIANT_ALIASES = {
  full: "fullcover",
  fullscreen: "fullcover",
  cover: "fullcover",
  featured: "hero",
} as const;

const SPACER_VARIANT_ALIASES = {
  small: "sm",
  medium: "md",
  large: "lg",
  xs: "sm",
  xl: "lg",
} as const;

const elementHeadingSchema = z
  .object({
    type: z.literal("elementHeading"),
    /** Preset key for `pbBuilderDefaultsV1.elements.heading` variant templates. */
    variant: jsonNullishOptional(
      variantWithAliases(["display", "section", "label"] as const, HEADING_VARIANT_ALIASES)
    ),
    level: jsonNullishOptional(headingLevelSchema),
    /** Optional semantic heading level (h1–h6) for document outline. When set, used for the element tag; `level` still drives typography style. Use to fix heading order (e.g. level 4 style with semanticLevel 2 for correct outline). */
    semanticLevel: jsonNullishOptional(headingLevelSchema),
    text: z.string(),
    wordWrap: jsonNullishOptional(z.boolean()),
    color: jsonNullishOptional(themeStringSchema),
    textFill: jsonNullishOptional(textFillSchema),
    /** When set, renders the variable value from the store instead of static `text`. */
    variableKey: jsonNullishOptional(z.string()),
    maxLines: jsonNullishOptional(z.number().int().positive()),
  })
  .merge(typographyOverridesSchema)
  .merge(elementLayoutSchema);

const BODY_VARIANT_ALIASES = {
  intro: "lead",
  paragraph: "standard",
  body: "standard",
  bodytext: "standard",
  caption: "fine",
  fineprint: "fine",
  small: "fine",
} as const;

const elementBodySchema = z
  .object({
    type: z.literal("elementBody"),
    /** Preset key for `pbBuilderDefaultsV1.elements.body` variant templates. */
    variant: jsonNullishOptional(
      variantWithAliases(["lead", "standard", "fine"] as const, BODY_VARIANT_ALIASES)
    ),
    text: z.string(),
    level: responsiveElementBodyVariantSchema.optional(),
    wordWrap: jsonNullishOptional(z.boolean()),
    /** When set, renders the variable value from the store instead of static `text`. */
    variableKey: jsonNullishOptional(z.string()),
    /**
     * When true and this body sits under `elementAudio` transport context, `text` is ignored and
     * the label shows live current time / duration (e.g. module chrome).
     */
    bindAudioTransportTime: z.literal(true).optional(),
    /**
     * When true and this body sits under `elementAudio` transport context, `text` is ignored and
     * the label shows the live current playback time (e.g. "1:23").
     */
    bindAudioCurrentTime: z.literal(true).optional(),
    /**
     * When true and this body sits under `elementAudio` transport context, `text` is ignored and
     * the label shows the total track duration (e.g. "5:53").
     */
    bindAudioDuration: z.literal(true).optional(),
    /** Direct text color override. Takes precedence over typography class color. */
    color: jsonNullishOptional(themeStringSchema),
    textFill: jsonNullishOptional(textFillSchema),
    maxLines: jsonNullishOptional(z.number().int().positive()),
  })
  .merge(typographyOverridesSchema)
  .merge(elementLayoutSchema);

const elementLinkSchema = z
  .object({
    type: z.literal("elementLink"),
    /** Preset key for `pbBuilderDefaultsV1.elements.link` variant templates. */
    variant: jsonNullishOptional(
      variantWithAliases(["inline", "emphasis", "nav"] as const, LINK_VARIANT_ALIASES)
    ),
    label: z.string(),
    href: z.string(),
    external: z.boolean().optional(),
    target: z.enum(["_self", "_blank", "_parent", "_top"]).optional(),
    rel: z.string().optional(),
    download: z.union([z.boolean(), z.string()]).optional(),
    hreflang: z.string().optional(),
    ping: z.string().optional(),
    referrerPolicy: referrerPolicySchema.optional(),
    copyType: z.enum(["heading", "body"]).optional(),
    level: responsiveElementBodyVariantSchema.optional(),
    wordWrap: jsonNullishOptional(z.boolean()),
    linkDefault: themeStringSchema.optional(),
    linkHover: themeStringSchema.optional(),
    linkActive: themeStringSchema.optional(),
    linkDisabled: themeStringSchema.optional(),
    linkTransition: z.union([z.string(), z.number()]).optional(),
    disabled: z.boolean().optional(),
  })
  .merge(typographyOverridesSchema)
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
    variant: jsonNullishOptional(
      variantWithAliases(
        ["hero", "inline", "fullCover", "feature", "crop"] as const,
        IMAGE_VARIANT_ALIASES
      )
    ),
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
    /** Low-quality image placeholder URL, resolved at build time via CDN blur params. */
    blurDataURL: z.string().optional(),
  })
  .merge(elementLayoutSchema);

const elementVideoSchema = z
  .object({
    type: z.literal("elementVideo"),
    /** Preset key for `pbBuilderDefaultsV1.elements.video` variant templates. */
    variant: jsonNullishOptional(
      variantWithAliases(["inline", "compact", "fullcover", "hero"] as const, VIDEO_VARIANT_ALIASES)
    ),
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
    onVideoPlay: triggerActionSchemaCore.optional(),
    /** Action to fire when video is paused. */
    onVideoPause: triggerActionSchemaCore.optional(),
    /** Action to fire when video ends. */
    onVideoEnd: triggerActionSchemaCore.optional(),
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
    /**
     * WebVTT subtitle/caption tracks rendered as `<track>` children of the video element.
     * Each entry maps to one `<track>` element. At most one entry should have `default: true`.
     *
     * `kind` mirrors the HTML `<track kind>` attribute:
     *   - "subtitles"    — translated text of the audio (default)
     *   - "captions"     — transcription including non-speech sounds (a11y)
     *   - "descriptions" — audio description of video content for visually-impaired users
     *   - "chapters"     — chapter titles for navigation
     *   - "metadata"     — machine-readable data, not shown to users
     */
    tracks: z
      .array(
        z.object({
          /** WebVTT file URL. */
          src: z.string(),
          /** Track kind. Defaults to "subtitles" when omitted. */
          kind: z
            .enum(["subtitles", "captions", "descriptions", "chapters", "metadata"])
            .optional(),
          /** BCP-47 language tag, e.g. "en", "fr", "zh-Hant". */
          srclang: z.string().optional(),
          /** Human-readable track name shown in the browser's track menu. */
          label: z.string().optional(),
          /** When true this track is enabled by default. Only one track per kind should be default. */
          default: z.boolean().optional(),
        })
      )
      .optional(),
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
    /**
     * Raw SVG markup string to render inline.
     *
     * **SECURITY CONTRACT: the runtime SANITIZES this field before rendering.**
     * ElementSVG passes `markup` through `sanitizeSvgMarkup()` (packages/runtime-react/src/core/lib/sanitize-svg.ts)
     * which allowlists safe SVG tags and attributes, strips `<script>`, event handlers (on*),
     * and external resource references (data: URIs, external hrefs, xlink:href).
     * The sanitized string is then set via `dangerouslySetInnerHTML` — the XSS risk
     * is mitigated by the sanitizer, not by avoiding innerHTML.
     *
     * Consumers supplying this field should still validate their input, but are not
     * required to pre-sanitize: the runtime sanitizer is the authoritative enforcement
     * point at render time.
     */
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
    variant: jsonNullishOptional(
      variantWithAliases(["sm", "md", "lg"] as const, SPACER_VARIANT_ALIASES)
    ),
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

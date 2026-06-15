import { z } from "zod";
import { motionPropsSchema } from "./motion-props-schema";
import { peblorDefinitionBlockSchema } from "./page-definition-and-resolution-schemas";
import { sectionEffectSchema } from "./section-effect-schemas";

/** Optional modal enter/exit animation config from JSON. */
export const modalTransitionConfigSchema = z
  .object({
    enterDurationMs: z.number().nonnegative().optional(),
    exitDurationMs: z.number().nonnegative().optional(),
    easing: z.string().optional(),
  })
  .optional();

/**
 * Named size presets for the modal panel.
 * - sm: max-w-sm (~384px)
 * - md: max-w-md (~448px) — default
 * - lg: max-w-lg (~512px)
 * - xl: max-w-xl (~576px)
 * - full: fills the viewport (full-screen overlay)
 *
 * Explicit `width` / `maxWidth` fields override this when present.
 */
export const modalSizeSchema = z.enum(["sm", "md", "lg", "xl", "full"]);

/**
 * Anchoring position for the modal panel.
 * - center: centered dialog (default behavior)
 * - top / bottom / left / right: drawer / sheet anchored to that edge
 */
export const modalPositionSchema = z.enum(["center", "top", "bottom", "left", "right"]);

/**
 * Backdrop styling options for the modal overlay layer.
 * All fields are optional; absent fields fall back to the runtime default
 * (bg-black/80 backdrop-blur-sm for standalone, bg-background/52 backdrop-blur-sm
 * for page-level modals).
 */
export const modalBackdropSchema = z.object({
  /** CSS color value for the backdrop background, e.g. "rgba(0,0,0,0.7)" or "oklch(0% 0 0 / 80%)". */
  color: z.string().optional(),
  /** CSS blur amount applied via backdrop-filter, e.g. "4px". */
  blur: z.string().optional(),
  /** When true, the backdrop is fully transparent (no color, no blur). */
  hidden: z.boolean().optional(),
});

/**
 * Behavior vocabulary for a modal: controls size, positioning, interaction, backdrop, and
 * accessibility. All fields are optional — omitting the entire `behavior` block preserves
 * current runtime defaults exactly.
 */
export const modalBehaviorSchema = z.object({
  /**
   * Named size preset for the modal panel. Mapped to max-width constraints.
   * Explicit `width` / `maxWidth` fields override this when both are present.
   * Default: "md" (max-w-md).
   */
  size: modalSizeSchema.optional(),

  /** Explicit CSS width for the modal panel, e.g. "32rem". Overrides `size`. */
  width: z.string().optional(),
  /** Explicit CSS max-width, e.g. "min(92vw, 36rem)". Overrides `size`. */
  maxWidth: z.string().optional(),
  /** Explicit CSS height for the modal panel, e.g. "80vh". */
  height: z.string().optional(),
  /** Explicit CSS max-height. Default: "90vh". */
  maxHeight: z.string().optional(),

  /**
   * Anchoring position for the modal panel.
   * center (default) renders a centered dialog.
   * top / bottom / left / right renders a drawer / sheet anchored to that edge.
   */
  position: modalPositionSchema.optional(),

  /**
   * Whether clicking the backdrop (overlay) closes the modal.
   * Default: true (current runtime behavior).
   */
  closeOnBackdropClick: z.boolean().optional(),

  /**
   * Whether pressing Escape closes the modal.
   * Default: true (current runtime behavior).
   */
  closeOnEscape: z.boolean().optional(),

  /** Backdrop overlay styling. When omitted, runtime defaults are used. */
  backdrop: modalBackdropSchema.optional(),

  /**
   * Whether focus is trapped inside the modal while it is open.
   * Default: true (current runtime behavior — Tab cycles within the dialog).
   */
  trapFocus: z.boolean().optional(),

  /**
   * CSS z-index for the modal overlay. When omitted, falls back to
   * the site-wide `--pb-z-modal` CSS custom property.
   */
  zIndex: z.number().int().optional(),

  /**
   * Accessible name for the modal dialog element (`aria-label`).
   * Use when the modal has no visible heading, or to provide a more descriptive label
   * than what `title` conveys. When absent, `aria-labelledby` is used if `title` is set.
   */
  ariaLabel: z.string().optional(),
});

/** Modal content definition: sectionOrder + definitions, mirroring peblor page shape. */
export const modalBuilderSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().optional(),
    sectionOrder: z.array(z.string()),
    definitions: z.record(z.string(), peblorDefinitionBlockSchema).optional(),
    transition: modalTransitionConfigSchema,
    motion: motionPropsSchema,
    /** Generic visual effects for the modal dialog surface, including glass. */
    effects: z.array(sectionEffectSchema).optional(),
    /** Behavior vocabulary: size, position, backdrop, interaction, accessibility (gap 2.4). */
    behavior: modalBehaviorSchema.optional(),
    /** Extension namespace for forward-compatible, tool-specific data (C-21). */
    extensions: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((data, ctx) => {
    const defs = data.definitions ?? {};
    for (let i = 0; i < data.sectionOrder.length; i++) {
      const key = data.sectionOrder[i];
      if (!key) continue;
      if (!(key in defs)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sectionOrder", i],
          message: `sectionOrder key "${key}" does not resolve to any definition in modal "${data.id}"`,
        });
      }
    }
  });

export type ModalTransitionConfigFromSchema = z.infer<typeof modalTransitionConfigSchema>;
export type ModalBuilderFromSchema = z.infer<typeof modalBuilderSchema>;
export type ModalBehaviorFromSchema = z.infer<typeof modalBehaviorSchema>;
export type ModalSizeFromSchema = z.infer<typeof modalSizeSchema>;
export type ModalPositionFromSchema = z.infer<typeof modalPositionSchema>;
export type ModalBackdropFromSchema = z.infer<typeof modalBackdropSchema>;

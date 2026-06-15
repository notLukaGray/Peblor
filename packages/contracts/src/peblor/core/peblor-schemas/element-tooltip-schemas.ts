import { z } from "zod";
import { elementLayoutSchema } from "./element-foundation-schemas";
import { themeStringSchema } from "./schema-primitives";

const tooltipPlacementSchema = z.enum(["top", "bottom", "left", "right", "auto"]).optional();
const tooltipTriggerSchema = z.enum(["hover", "click", "focus"]).optional();

export const elementTooltipSchema = z
  .object({
    type: z.literal("elementTooltip"),
    content: z.string(),
    triggerLabel: z.string().optional(),
    placement: tooltipPlacementSchema,
    trigger: tooltipTriggerSchema,
    showDelay: z.number().nonnegative().optional(),
    hideDelay: z.number().nonnegative().optional(),
    /**
     * Distance between the tooltip and its trigger element, as a CSS length or two-value
     * string (e.g. `"8px"` for distance-only, `"8px 4px"` for distance + skid).
     */
    offset: z.string().optional(),
    /**
     * When `true`, the tooltip automatically flips to the opposite placement when the
     * preferred placement would overflow the boundary. Defaults to `true`.
     * Set `false` to always use the preferred `placement` even when clipped.
     */
    autoFlip: z.boolean().optional(),
    /**
     * The boundary element used for overflow/flip detection.
     * - `"viewport"` (default): flip when the tooltip would leave the viewport.
     * - `"scrollParent"`: flip against the nearest scrollable ancestor.
     * - `"window"`: flip against the browser window.
     * - `"clippingAncestors"`: clip against all overflow-hidden ancestors (Floating UI default).
     */
    boundary: z.enum(["viewport", "scrollParent", "window", "clippingAncestors"]).optional(),
    arrow: z.boolean().optional(),
    interactive: z.boolean().optional(),
    followCursor: z.boolean().optional(),
    maxWidth: z.string().optional(),
    zIndex: z.number().optional(),
    /**
     * Use layout `motion` (Framer Motion JSON) for entrance animation control.
     */
    color: themeStringSchema.optional(),
    fontFamily: z.string().optional(),
    fontSize: z.union([z.string(), z.number()]).optional(),
    fontWeight: z.union([z.string(), z.number()]).optional(),
    ariaLabel: z.string().optional(),
  })
  .merge(elementLayoutSchema);

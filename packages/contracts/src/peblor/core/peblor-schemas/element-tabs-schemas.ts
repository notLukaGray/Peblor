import { z } from "zod";
import { elementLayoutSchema } from "./element-foundation-schemas";
import { jsonNullishOptional, responsiveStringSchema } from "./schema-primitives";
// B-4 / C-15: Cannot import elementBlockSchema from element-block-schemas.ts directly
// (that file imports this one, creating a circular dep). Instead, import the shared lazy
// ref from lazy-element-ref.ts, which is populated by element-block-schemas.ts after init.
import { lazyElementBlock as lazyTabElementBlock } from "./lazy-element-ref";

const tabsVariantSchema = jsonNullishOptional(
  z.enum(["underline", "pill", "contained", "vertical"])
);
const tabAlignmentSchema = z.enum(["start", "center", "end", "stretch"]).optional();
const tabAnimationSchema = z.enum(["fade", "slide", "none"]).optional();

const tabEntrySchema = z.object({
  label: z.string(),
  icon: z.string().optional(),
  badge: z.union([z.string(), z.number()]).optional(),
  disabled: z.boolean().optional(),
  elements: z.array(lazyTabElementBlock),
});

export const elementTabsSchema = z
  .object({
    type: z.literal("elementTabs"),
    tabs: z.array(tabEntrySchema),
    variant: tabsVariantSchema,
    activeTab: z.number().int().nonnegative().optional(),
    tabAlignment: tabAlignmentSchema,
    contentAnimation: tabAnimationSchema,
    lazyLoad: z.boolean().optional(),
    scrollable: z.boolean().optional(),
    mobileCollapse: z.boolean().optional(),
    keyboardNav: z.boolean().optional(),
    /**
     * Explicit layout orientation for the tab list.
     * `"horizontal"` (default): tabs run left-to-right.
     * `"vertical"`: tabs stack top-to-bottom (sidebar style).
     * When `variant` is `"vertical"` this is implied; `orientation` takes
     * precedence when both are set.
     */
    orientation: z.enum(["horizontal", "vertical"]).optional(),
    /**
     * ARIA activation mode for the tab list (WAI-ARIA tabs pattern).
     * `"automatic"` (default): panel switches immediately on focus/arrow-key.
     * `"manual"`: panel only switches when the user presses Enter or Space.
     */
    activationMode: z.enum(["automatic", "manual"]).optional(),
    tabColor: z.string().optional(),
    tabActiveColor: z.string().optional(),
    tabActiveBackground: z.string().optional(),
    tabFontFamily: z.string().optional(),
    tabFontSize: z.union([z.string(), z.number()]).optional(),
    tabFontWeight: z.union([z.string(), z.number()]).optional(),
    tabGap: responsiveStringSchema.optional(),
    tabPadding: responsiveStringSchema.optional(),
    tabMinWidth: responsiveStringSchema.optional(),
    contentPadding: responsiveStringSchema.optional(),
    ariaLabel: z.string().optional(),
  })
  .merge(elementLayoutSchema);

import { z } from "zod";
import { elementLayoutSchema } from "./element-foundation-schemas";
import { jsonNullishOptional, responsiveStringSchema } from "./schema-primitives";

const tabsVariantSchema = jsonNullishOptional(
  z.enum(["underline", "pill", "contained", "vertical"])
);
const tabAlignmentSchema = z.enum(["start", "center", "end", "stretch"]).optional();
const tabAnimationSchema = z.enum(["fade", "slide", "none"]).optional();

const lazyTabElementBlock: z.ZodType<unknown> = z.lazy(() =>
  z.object({ type: z.string() }).passthrough()
);

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

import { z } from "zod";
import {
  hasUniqueSectionColumnElementIds,
  hasValidSectionColumnAssignments,
  hasValidSectionColumnElementOrder,
  hasValidSectionColumnSpanReferences,
  hasValidSectionItemLayoutReferences,
  hasValidSectionItemStyleReferences,
} from "./section-column-validation";
import {
  baseSectionPropsSchema,
  sectionColumnBaseSchema,
  sectionContentBlockSchema,
  sectionDividerSchema,
  sectionFormBlockSchema,
  sectionRevealSchema,
  sectionScrollContainerSchema,
  sectionTriggerSchema,
} from "./section-block-base-schemas";

const sectionColumnSchema = sectionColumnBaseSchema
  .refine(hasUniqueSectionColumnElementIds, {
    message: "Every element must have a unique, non-empty id within this section",
    path: ["elements"],
  })
  .refine(hasValidSectionColumnElementOrder, {
    message: "Invalid elementOrder",
    path: ["elementOrder"],
  })
  .refine(hasValidSectionColumnAssignments, {
    message: "Invalid columnAssignments",
    path: ["columnAssignments"],
  })
  .refine(hasValidSectionColumnSpanReferences, {
    message: "columnSpan must reference existing element IDs",
    path: ["columnSpan"],
  })
  .refine(hasValidSectionItemStyleReferences, {
    message: "itemStyles must reference existing element IDs",
    path: ["itemStyles"],
  })
  .refine(hasValidSectionItemLayoutReferences, {
    message: "itemLayout must reference existing element IDs",
    path: ["itemLayout"],
  });

export const sectionBlockSchema = z.discriminatedUnion("type", [
  sectionDividerSchema,
  sectionContentBlockSchema,
  sectionScrollContainerSchema,
  sectionColumnSchema,
  sectionTriggerSchema,
  sectionFormBlockSchema,
  sectionRevealSchema,
]);

export { baseSectionPropsSchema };

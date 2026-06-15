import { memo, type ComponentType } from "react";
import type { SectionBlock } from "@pb/contracts/types";
import { SectionDivider } from "./SectionDivider";
import { SectionContentBlock } from "./SectionContentBlock";
import { ScrollContainerSection } from "./ScrollContainerSection";
import { PageTrigger, PEBLOR_TRIGGER_EVENT } from "@/peblor/triggers";
import { SectionColumn } from "./SectionColumn";
import { SectionFormBlock } from "./SectionFormBlock/SectionFormBlock";
import { SectionReveal } from "./SectionReveal";
import { PageMountTrigger } from "./PageMountTrigger";

export {
  SectionDivider,
  SectionContentBlock,
  ScrollContainerSection,
  SectionColumn,
  SectionFormBlock,
  SectionReveal,
  PageTrigger,
  PageMountTrigger,
  PEBLOR_TRIGGER_EVENT,
};
export type { PeblorTriggerDetail } from "@/peblor/triggers";
export { useSectionViewportTrigger } from "@/peblor/triggers/core/use-section-viewport-trigger";
export type { SectionViewportTriggerOptions } from "@/peblor/triggers/core/use-section-viewport-trigger";

type SectionComponentProps = SectionBlock & { _isFirstSection?: boolean };

export const SECTION_COMPONENTS: Record<string, ComponentType<SectionComponentProps>> = {
  divider: memo(SectionDivider) as ComponentType<SectionComponentProps>,
  contentBlock: memo(SectionContentBlock) as ComponentType<SectionComponentProps>,
  scrollContainer: memo(ScrollContainerSection) as ComponentType<SectionComponentProps>,
  sectionColumn: memo(SectionColumn) as ComponentType<SectionComponentProps>,
  sectionTrigger: memo(PageTrigger) as ComponentType<SectionComponentProps>,
  pageTrigger: memo(PageMountTrigger) as ComponentType<SectionComponentProps>,
  formBlock: memo(SectionFormBlock) as ComponentType<SectionComponentProps>,
  revealSection: memo(SectionReveal) as ComponentType<SectionComponentProps>,
};

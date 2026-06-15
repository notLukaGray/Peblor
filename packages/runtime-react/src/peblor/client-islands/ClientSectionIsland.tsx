"use client";

import type { SectionBlock } from "@pb/contracts/types";
import type { ComponentType, ReactNode } from "react";
import dynamic from "next/dynamic";
import { SectionErrorBoundary } from "../SectionErrorBoundary";

const SectionColumn = dynamic(() =>
  import("../section/SectionColumn").then((mod) => mod.SectionColumn as ComponentType<SectionBlock>)
) as ComponentType<SectionBlock>;

const SectionContentBlock = dynamic(() =>
  import("../section/SectionContentBlock").then(
    (mod) => mod.SectionContentBlock as ComponentType<SectionBlock>
  )
) as ComponentType<SectionBlock>;

const SectionDivider = dynamic(() =>
  import("../section/SectionDivider").then(
    (mod) => mod.SectionDivider as ComponentType<SectionBlock>
  )
) as ComponentType<SectionBlock>;

const ScrollContainerSection = dynamic(() =>
  import("../section/ScrollContainerSection").then(
    (mod) => mod.ScrollContainerSection as ComponentType<SectionBlock>
  )
) as ComponentType<SectionBlock>;

const PageTrigger = dynamic(() =>
  import("../triggers").then((mod) => mod.PageTrigger as ComponentType<SectionBlock>)
) as ComponentType<SectionBlock>;

const SectionFormBlock = dynamic(() =>
  import("../section/SectionFormBlock/SectionFormBlock").then(
    (mod) => mod.SectionFormBlock as ComponentType<SectionBlock>
  )
) as ComponentType<SectionBlock>;

const SectionReveal = dynamic(() =>
  import("../section/SectionReveal").then((mod) => mod.SectionReveal as ComponentType<SectionBlock>)
) as ComponentType<SectionBlock>;

export function ClientSectionIsland({ section }: { section: SectionBlock }) {
  const sectionKey = (section as SectionBlock & { id?: string }).id ?? section.type;

  let content: ReactNode;
  if (section.type === "sectionColumn") content = <SectionColumn {...section} />;
  else if (section.type === "contentBlock") content = <SectionContentBlock {...section} />;
  else if (section.type === "divider") content = <SectionDivider {...section} />;
  else if (section.type === "scrollContainer") content = <ScrollContainerSection {...section} />;
  else if (section.type === "sectionTrigger") content = <PageTrigger {...section} />;
  else if (section.type === "formBlock") content = <SectionFormBlock {...section} />;
  else if (section.type === "revealSection") content = <SectionReveal {...section} />;
  else {
    const unknownType = (section as { type?: string }).type ?? "unknown";
    throw new Error(`unknown client section type: "${unknownType}"`);
  }

  return (
    <div style={{ position: "relative" }}>
      <SectionErrorBoundary sectionKey={sectionKey}>{content}</SectionErrorBoundary>
    </div>
  );
}

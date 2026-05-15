import type { ElementBlock, SectionBlock } from "@pb/contracts/types";
import type { VisibleWhenConfig } from "@pb/contracts/peblor/core/peblor-condition-evaluator";
import { resolveSectionContentBlockElements } from "../../section/SectionContentBlock/section-content-block-element-resolution";
import { ServerElementRenderer } from "../ServerElementRenderer";
import { ClientMixedContentBlockShell } from "../../client-islands/ClientMixedContentBlockShell";

type Props = Extract<SectionBlock, { type: "contentBlock" }> & {
  elementOrder?: string[] | { mobile?: string[]; desktop?: string[] };
  definitions?: Record<string, unknown>;
  serverIsMobile?: boolean;
};

export function MixedServerSectionContentBlock({
  elements: elementsProp = [],
  elementOrder,
  definitions: sectionDefinitions,
  visibleWhen,
  serverIsMobile,
  ...rest
}: Props) {
  const isMobile = serverIsMobile ?? false;
  const elements = resolveSectionContentBlockElements({
    elementsProp,
    elementOrder: Array.isArray(elementOrder)
      ? elementOrder
      : isMobile
        ? (elementOrder as { mobile?: string[] } | undefined)?.mobile
        : (elementOrder as { desktop?: string[] } | undefined)?.desktop,
    sectionDefinitions: sectionDefinitions as Parameters<
      typeof resolveSectionContentBlockElements
    >[0]["sectionDefinitions"],
  });

  return (
    <ClientMixedContentBlockShell
      {...rest}
      visibleWhen={visibleWhen as VisibleWhenConfig | undefined}
      elementCount={elements.length}
    >
      {elements.map((element: ElementBlock, index: number) => (
        <ServerElementRenderer
          key={(element as ElementBlock & { id?: string }).id ?? index}
          block={element}
          serverIsMobile={serverIsMobile}
        />
      ))}
    </ClientMixedContentBlockShell>
  );
}

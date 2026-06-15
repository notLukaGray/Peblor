/**
 * Mixed server/client content block section.
 *
 * Renders the element list on the server (SSR) via ServerElementRenderer, and
 * delegates all layout/fill/glass/motion to the client island
 * (ClientMixedContentBlockShell → MixedSectionContentBlockIsland).
 *
 * This split is intentional: element children are rendered server-side for SEO
 * and LCP, while the section's layout (responsive flex, content width/height,
 * scroll opacity, sticky, visibleWhen conditions) requires client-side hooks
 * (useDeviceType, useSectionBaseStyles, useVariableStore, etc.).
 *
 * Layout responsibilities:
 *   - Server: element resolution from elementOrder/definitions
 *   - Client (MixedSectionContentBlockIsland): flex layout, gap, padding,
 *     contentWidth/Height, fill, layers, sticky, fixed, glass, triggers,
 *     entrance motion, visibleWhen evaluation
 */

import type { ElementBlock, SectionBlock } from "@pb/contracts/types";
import type { VisibleWhenConfig } from "@pb/contracts/peblor/core/peblor-condition-evaluator";
import { generateElementKey } from "@pb/core/keys";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import { resolveSectionContentBlockElements } from "../../section/SectionContentBlock/section-content-block-element-resolution";
import { ServerElementRenderer } from "../ServerElementRenderer";
import { ClientMixedContentBlockShell } from "../../client-islands/ClientMixedContentBlockShell";

type Props = Extract<SectionBlock, { type: "contentBlock" }> & {
  elementOrder?: string[] | { base?: string[]; md?: string[] };
  definitions?: Record<string, unknown>;
  serverIsMobile?: boolean;
  hydrationPriority?: "critical" | "approaching" | "idle";
};

export function MixedServerSectionContentBlock({
  elements: elementsProp = [],
  elementOrder,
  definitions: sectionDefinitions,
  visibleWhen,
  serverIsMobile,
  hydrationPriority,
  ...rest
}: Props) {
  const isMobile = serverIsMobile ?? false;
  const elements = resolveSectionContentBlockElements({
    elementsProp,
    elementOrder: Array.isArray(elementOrder)
      ? elementOrder
      : (resolveResponsiveValue(elementOrder, isMobile) ?? []),
    sectionDefinitions: sectionDefinitions as Parameters<
      typeof resolveSectionContentBlockElements
    >[0]["sectionDefinitions"],
  });

  return (
    <ClientMixedContentBlockShell
      {...rest}
      visibleWhen={visibleWhen as VisibleWhenConfig | undefined}
      elementCount={elements.length}
      hydrationPriority={hydrationPriority}
    >
      {elements.map((element: ElementBlock, index: number) => (
        <ServerElementRenderer
          key={generateElementKey(element, index)}
          block={element}
          serverIsMobile={serverIsMobile}
        />
      ))}
    </ClientMixedContentBlockShell>
  );
}

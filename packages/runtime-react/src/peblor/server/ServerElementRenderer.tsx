import type { ElementBlock } from "@pb/contracts/types";
import type { BlockCapabilityNode } from "../analyze/block-capabilities";
import { resolveElementBlockForBreakpoint } from "@pb/core/layout";
import { analyzeBlockCapabilities } from "../analyze/block-capabilities";
import { ClientElementIsland } from "../client-islands/ClientElementIsland";
import { ServerElementGroup } from "./elements/ServerElementGroup";
import { MixedServerElementGroup } from "./elements/MixedServerElementGroup";
import { MixedServerElementRichText } from "./elements/MixedServerElementRichText";
import { SERVER_ELEMENT_COMPONENTS } from "./server-element-registry";

export type ServerElementRendererProps = {
  block: ElementBlock;
  serverIsMobile?: boolean;
  analysisNode?: BlockCapabilityNode;
};

type ElementGroupExtended = Extract<ElementBlock, { type: "elementGroup" }> & {
  motionTiming?: unknown;
  layoutChildren?: boolean;
  visibleWhen?: unknown;
};

export function ServerElementRenderer({
  block,
  serverIsMobile,
  analysisNode,
}: ServerElementRendererProps) {
  const resolvedBlock =
    serverIsMobile === undefined ? block : resolveElementBlockForBreakpoint(block, serverIsMobile);
  const elementAnalysis =
    analysisNode ??
    analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [{ type: "contentBlock", elements: [resolvedBlock] } as never],
    }).tree.children[0]?.children[0];
  if (elementAnalysis?.classification !== "static") {
    if (resolvedBlock.type === "elementGroup") {
      const group = resolvedBlock as ElementGroupExtended;
      if (!group.motionTiming && !group.layoutChildren && !group.visibleWhen) {
        return (
          <MixedServerElementGroup
            {...(group as Extract<ElementBlock, { type: "elementGroup" }>)}
            serverIsMobile={serverIsMobile}
          />
        );
      }
    }
    if (resolvedBlock.type === "elementRichText") {
      return (
        <MixedServerElementRichText
          {...(resolvedBlock as Extract<ElementBlock, { type: "elementRichText" }>)}
        />
      );
    }
    return <ClientElementIsland block={resolvedBlock} />;
  }

  if (resolvedBlock.type === "elementGroup") {
    return (
      <ServerElementGroup
        {...(resolvedBlock as Extract<ElementBlock, { type: "elementGroup" }>)}
        serverIsMobile={serverIsMobile}
      />
    );
  }

  const Component = SERVER_ELEMENT_COMPONENTS[resolvedBlock.type];
  if (!Component) {
    throw new Error(`unknown server element type: "${resolvedBlock.type}"`);
  }

  return <Component {...resolvedBlock} />;
}

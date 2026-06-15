import type { SectionBlock } from "@pb/contracts/types";
import type { BlockCapabilityNode } from "../analyze/block-capabilities";
import { analyzeBlockCapabilities } from "../analyze/block-capabilities";
import { ClientSectionIsland } from "../client-islands/ClientSectionIsland";
import { MixedServerSectionContentBlock } from "./sections/MixedServerSectionContentBlock";
import { MixedServerSectionColumn } from "./sections/MixedServerSectionColumn";
import { SERVER_SECTION_COMPONENTS } from "./server-section-registry";

export type ServerSectionRendererProps = {
  section: SectionBlock;
  serverIsMobile?: boolean;
  analysisNode?: BlockCapabilityNode;
};

type SectionColumnExtended = Extract<SectionBlock, { type: "sectionColumn" }> & {
  gridMode?: unknown;
  itemStyles?: unknown;
  contentWidth?: unknown;
  contentHeight?: unknown;
  itemLayout?: unknown;
};

export function ServerSectionRenderer({
  section,
  serverIsMobile,
  analysisNode,
}: ServerSectionRendererProps) {
  const sectionAnalysis =
    analysisNode ??
    analyzeBlockCapabilities({ resolvedBg: null, resolvedSections: [section] }).tree.children[0];

  const hasVisibleWhen = (section as Record<string, unknown>).visibleWhen != null;

  if (sectionAnalysis?.classification === "client") {
    // When visibleWhen is present and cannot be resolved server-side, omit entirely
    // from server HTML. The ClientSectionIsland will handle rendering when conditions pass.
    if (hasVisibleWhen) {
      return <ClientSectionIsland section={section} />;
    }

    if (
      section.type === "contentBlock" &&
      !(section as SectionBlock & { reorderable?: boolean }).reorderable
    ) {
      return (
        <MixedServerSectionContentBlock
          {...(section as Extract<SectionBlock, { type: "contentBlock" }>)}
          serverIsMobile={serverIsMobile}
          hydrationPriority={analysisNode?.priority ?? "idle"}
        />
      );
    }
    if (section.type === "sectionColumn") {
      const col = section as SectionColumnExtended;
      // columnStyles and gridAutoRows are handled by MixedServerSectionColumn via ...rest →
      // ClientMixedSectionColumnShell. Only props that require useColumnLayout / useDeviceType
      // at render time (gridMode, itemStyles, itemLayout, contentWidth, contentHeight) are
      // genuinely incompatible with the mixed server path.
      const hasComplexFeatures =
        col.gridMode != null ||
        col.itemStyles != null ||
        col.contentWidth != null ||
        col.contentHeight != null ||
        col.itemLayout != null;
      if (!hasComplexFeatures) {
        return (
          <MixedServerSectionColumn
            {...(col as Extract<SectionBlock, { type: "sectionColumn" }>)}
            serverIsMobile={serverIsMobile}
            hydrationPriority={analysisNode?.priority ?? "idle"}
          />
        );
      }
    }
    return <ClientSectionIsland section={section} />;
  }

  const Component = SERVER_SECTION_COMPONENTS[section.type];

  if (!Component) {
    throw new Error(`unknown server section type: "${section.type}"`);
  }

  return <Component {...section} serverIsMobile={serverIsMobile} />;
}

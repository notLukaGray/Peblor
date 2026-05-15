import type { ComponentType } from "react";
import type { SectionBlock } from "@pb/contracts/types";
import { ServerSectionColumn } from "./sections/ServerSectionColumn";
import { ServerSectionContentBlock } from "./sections/ServerSectionContentBlock";
import { ServerSectionDivider } from "./sections/ServerSectionDivider";

type ServerSectionComponentProps = SectionBlock & { serverIsMobile?: boolean };

export const SERVER_SECTION_COMPONENTS: Record<
  string,
  ComponentType<ServerSectionComponentProps>
> = {
  divider: ServerSectionDivider as ComponentType<ServerSectionComponentProps>,
  contentBlock: ServerSectionContentBlock as ComponentType<ServerSectionComponentProps>,
  sectionColumn: ServerSectionColumn as ComponentType<ServerSectionComponentProps>,
};

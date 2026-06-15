import type { ComponentType } from "react";
import type { ServerElementComponentProps } from "./server-element-types";
import { ServerElementBody } from "./elements/ServerElementBody";
import { ServerElementDivider } from "./elements/ServerElementDivider";
import { ServerElementHeading } from "./elements/ServerElementHeading";
import { ServerElementGroup } from "./elements/ServerElementGroup";
import { ServerElementImage } from "./elements/ServerElementImage";
import { ServerElementLink } from "./elements/ServerElementLink";
import { ServerElementSpacer } from "./elements/ServerElementSpacer";
import { ServerElementVector } from "./elements/ServerElementVector";
import { ServerElementCounter } from "./elements/ServerElementCounter";
import { ServerElementEmbed } from "./elements/ServerElementEmbed";
import { ServerElementList } from "./elements/ServerElementList";
import { ServerElementBlockquote } from "./elements/ServerElementBlockquote";
import { ServerElementTable } from "./elements/ServerElementTable";
import { ServerElementButton } from "./elements/ServerElementButton";
import { ServerElementCode } from "./elements/ServerElementCode";
import { ServerElementRichText } from "./elements/ServerElementRichText";

export type { ServerElementComponentProps } from "./server-element-types";

export const SERVER_ELEMENT_COMPONENTS: Record<
  string,
  ComponentType<ServerElementComponentProps>
> = {
  elementHeading: ServerElementHeading as ComponentType<ServerElementComponentProps>,
  elementBody: ServerElementBody as ComponentType<ServerElementComponentProps>,
  elementLink: ServerElementLink as ComponentType<ServerElementComponentProps>,
  elementImage: ServerElementImage as ComponentType<ServerElementComponentProps>,
  elementSpacer: ServerElementSpacer as ComponentType<ServerElementComponentProps>,
  elementDivider: ServerElementDivider as ComponentType<ServerElementComponentProps>,
  elementGroup: ServerElementGroup as ComponentType<ServerElementComponentProps>,
  elementVector: ServerElementVector as ComponentType<ServerElementComponentProps>,
  elementCounter: ServerElementCounter as ComponentType<ServerElementComponentProps>,
  elementEmbed: ServerElementEmbed as ComponentType<ServerElementComponentProps>,
  elementList: ServerElementList as ComponentType<ServerElementComponentProps>,
  elementBlockquote: ServerElementBlockquote as ComponentType<ServerElementComponentProps>,
  elementButton: ServerElementButton as ComponentType<ServerElementComponentProps>,
  elementTable: ServerElementTable as ComponentType<ServerElementComponentProps>,
  elementCode: ServerElementCode as ComponentType<ServerElementComponentProps>,
  elementRichText: ServerElementRichText as ComponentType<ServerElementComponentProps>,
};

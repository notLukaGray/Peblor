import type { ComponentType } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import { ServerElementBody } from "./elements/ServerElementBody";
import { ServerElementDivider } from "./elements/ServerElementDivider";
import { ServerElementHeading } from "./elements/ServerElementHeading";
import { ServerElementGroup } from "./elements/ServerElementGroup";
import { ServerElementImage } from "./elements/ServerElementImage";
import { ServerElementLink } from "./elements/ServerElementLink";
import { ServerElementSpacer } from "./elements/ServerElementSpacer";
import { ServerElementVector } from "./elements/ServerElementVector";
import { ServerElementCounter } from "./elements/ServerElementCounter";

export const SERVER_ELEMENT_COMPONENTS: Record<string, ComponentType<ElementBlock>> = {
  elementHeading: ServerElementHeading as ComponentType<ElementBlock>,
  elementBody: ServerElementBody as ComponentType<ElementBlock>,
  elementLink: ServerElementLink as ComponentType<ElementBlock>,
  elementImage: ServerElementImage as ComponentType<ElementBlock>,
  elementSpacer: ServerElementSpacer as ComponentType<ElementBlock>,
  elementDivider: ServerElementDivider as ComponentType<ElementBlock>,
  elementGroup: ServerElementGroup as ComponentType<ElementBlock>,
  elementVector: ServerElementVector as ComponentType<ElementBlock>,
  elementCounter: ServerElementCounter as ComponentType<ElementBlock>,
};

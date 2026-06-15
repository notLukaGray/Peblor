import type { ElementBlock } from "@pb/contracts/types";
import { ServerElementList } from "../server/elements/ServerElementList";

type Props = Extract<ElementBlock, { type: "elementList" }>;

export function ElementList(props: Props) {
  return <ServerElementList {...props} />;
}

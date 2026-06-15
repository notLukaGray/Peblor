import type { ElementBlock } from "@pb/contracts/types";
import { ServerElementCode } from "../server/elements/ServerElementCode";

type Props = Extract<ElementBlock, { type: "elementCode" }>;

export function ElementCode(props: Props) {
  return <ServerElementCode {...props} />;
}

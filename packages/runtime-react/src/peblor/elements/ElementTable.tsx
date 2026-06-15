import type { ElementBlock } from "@pb/contracts/types";
import { ServerElementTable } from "../server/elements/ServerElementTable";

type Props = Extract<ElementBlock, { type: "elementTable" }>;

export function ElementTable(props: Props) {
  return <ServerElementTable {...props} />;
}

import type { ElementBlock } from "@pb/contracts/types";
import { ServerElementBlockquote } from "../server/elements/ServerElementBlockquote";

type Props = Extract<ElementBlock, { type: "elementBlockquote" }>;

export function ElementBlockquote(props: Props) {
  return <ServerElementBlockquote {...props} />;
}

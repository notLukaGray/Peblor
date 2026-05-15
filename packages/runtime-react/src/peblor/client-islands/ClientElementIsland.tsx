"use client";

import type { ElementBlock } from "@pb/contracts/types";
import { ElementRenderer } from "../elements/Shared/ElementRenderer";

export function ClientElementIsland({ block }: { block: ElementBlock }) {
  return <ElementRenderer block={block} />;
}

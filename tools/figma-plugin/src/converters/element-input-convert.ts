/**
 * INSTANCE → elementInput (glass search-style input) when main component looks like a field.
 */

import type { ElementBlock } from "../types/peblor";
import type { ConversionContext } from "../types/figma-plugin";
import { slugify, ensureUniqueId } from "../utils/slugify";
import { extractLayoutProps } from "./layout";
import { stripAnnotations } from "./annotations-parse";
import { inferNodeId } from "./node-element-helpers";

export async function convertElementInputFromInstance(
  node: InstanceNode,
  ctx: ConversionContext
): Promise<ElementBlock> {
  const id = ensureUniqueId(slugify(inferNodeId(node)), ctx.usedIds);
  const layout = extractLayoutProps(node);

  const textChild = node.findOne(
    (n) => n.type === "TEXT" && Boolean((n as TextNode).characters?.trim().length)
  ) as TextNode | null;
  const placeholder = textChild?.characters?.trim() || "Search";

  return {
    type: "elementInput",
    id,
    placeholder,
    ariaLabel: stripAnnotations(node.name) || undefined,
    ...layout,
  };
}

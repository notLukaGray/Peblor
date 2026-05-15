/**
 * Shared helper: convert a section frame's direct children to element blocks.
 */

import type { ElementBlock } from "../types/peblor";
import type { ConversionContext } from "../types/figma-plugin";
import { convertNode } from "./node-to-element";
import { ensureElementId, type GroupNodeParentCtx } from "./node-element-helpers";
import { EXPORT_DROP_REASON, recordConverterDrop } from "../export-parity";

export async function gatherDirectChildElements(
  frame: FrameNode,
  ctx: ConversionContext
): Promise<ElementBlock[]> {
  const elements: ElementBlock[] = [];
  const parentCtx: GroupNodeParentCtx = {
    layoutMode: frame.layoutMode ?? "NONE",
    parentWidth: typeof frame.width === "number" ? frame.width : undefined,
    parentHeight: typeof frame.height === "number" ? frame.height : undefined,
  };
  for (const child of frame.children) {
    try {
      const converted = await convertNode(child, ctx, parentCtx);
      if (converted !== null) {
        ensureElementId(converted, child.name || child.type, ctx, ctx.warnings);
        elements.push(converted);
      }
    } catch (err) {
      const detail =
        err instanceof Error && typeof err.stack === "string"
          ? err.stack.split("\n").slice(0, 4).join(" | ")
          : String(err);
      recordConverterDrop(ctx, EXPORT_DROP_REASON.GATHER_CHILD_ERROR, {
        nodeName: child.name,
        nodeType: child.type,
      });
      ctx.warnings.push(
        `[error] gatherDirectChildElements: error converting child "${child.name}" in "${frame.name}": ${detail}`
      );
    }
  }
  return elements;
}

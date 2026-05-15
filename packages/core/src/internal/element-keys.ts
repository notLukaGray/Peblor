import type { ElementBlock } from "@pb/contracts/types";

const elementKeyMemo = new WeakMap<ElementBlock, Map<number, string>>();

export function generateElementKey(block: ElementBlock, index: number): string {
  const byIndex = elementKeyMemo.get(block);
  const memoized = byIndex?.get(index);
  if (memoized) return memoized;

  const type = block.type;
  let resolved = `${type}_${index}`;

  // Prefer stable, author-controlled IDs when present; section schemas enforce uniqueness.
  if ("id" in block && typeof block.id === "string" && block.id.trim().length > 0) {
    resolved = `${type}_${block.id}`;
  } else if ("text" in block && typeof block.text === "string") {
    const textHash = block.text.slice(0, 20).replace(/\s/g, "_") + "_" + block.text.length;
    resolved = `${type}_${textHash}`;
  } else if ("src" in block && typeof block.src === "string" && block.src) {
    const srcHash = block.src.slice(-20).replace(/[^a-zA-Z0-9]/g, "_");
    resolved = `${type}_${srcHash}`;
  } else if (type === "elementVector" && "viewBox" in block && typeof block.viewBox === "string") {
    const shapesLen = Array.isArray(block.shapes) ? block.shapes.length : 0;
    const vbHash = block.viewBox.slice(0, 15).replace(/[^a-zA-Z0-9]/g, "_");
    resolved = `${type}_${vbHash}_${shapesLen}`;
  } else if (type === "elementSVG" && "markup" in block && typeof block.markup === "string") {
    const len = block.markup.length;
    const slice = block.markup.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_");
    resolved = `${type}_${slice}_${len}`;
  }

  if (byIndex) {
    byIndex.set(index, resolved);
  } else {
    elementKeyMemo.set(block, new Map([[index, resolved]]));
  }
  return resolved;
}

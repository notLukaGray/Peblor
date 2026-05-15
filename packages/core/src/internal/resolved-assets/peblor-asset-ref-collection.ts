import type { bgBlock, SectionBlock } from "@pb/contracts";
import { walkPeblorAssetTree } from "./peblor-asset-tree-walk";

type AssetRefCollector = { seen: Set<string>; refs: string[] };

function addAssetRef(ref: string, collector: AssetRefCollector): void {
  if (!ref || typeof ref !== "string") return;
  if (collector.seen.has(ref)) return;
  if (
    ref.startsWith("http://") ||
    ref.startsWith("https://") ||
    ref.startsWith("/api/media/") ||
    ref.startsWith("data:")
  )
    return;
  collector.seen.add(ref);
  collector.refs.push(ref);
}

export function collectPeblorAssetRefs(bg: bgBlock | null, sections: SectionBlock[]): string[] {
  const collector: AssetRefCollector = { seen: new Set<string>(), refs: [] };

  walkPeblorAssetTree(bg, sections, (_key, value) => {
    if (typeof value === "string") addAssetRef(value, collector);
  });

  return collector.refs;
}

import type { PeblorDefinitionBlock } from "@pb/contracts";

export function mergeNestedSectionDefinitions(
  definitions: Record<string, PeblorDefinitionBlock>,
  nestedDefs: Record<string, unknown> | undefined,
  sectionSet: ReadonlySet<string>,
  sectionFile: string,
  globalKeys: ReadonlySet<string>
): void {
  if (!nestedDefs || typeof nestedDefs !== "object") return;
  for (const [key, value] of Object.entries(nestedDefs)) {
    if (sectionSet.has(key)) continue;
    if (value && typeof value === "object") {
      if (globalKeys.has(key)) {
        console.error(
          `[content] section file ${sectionFile} attempted to override global key '${key}' — skipped. Rename the local definition to avoid collision.`
        );
        continue;
      }
      definitions[key] = value as PeblorDefinitionBlock;
    }
  }
}

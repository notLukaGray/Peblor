import { moduleBlockSchema } from "@pb/contracts";
import { readContentFile, listContentDir } from "../lib/fs.js";
import { MODULES_DIR } from "../lib/paths.js";

type AnySchema = {
  shape?: Record<string, AnySchema>;
  def?: { shape?: Record<string, AnySchema>; type?: string };
};

function shapeKeys(schema: AnySchema): string[] {
  const shape = schema.shape ?? schema.def?.shape ?? {};
  return Object.keys(shape).sort((a, b) => a.localeCompare(b));
}

export type ModuleTypeSummary = {
  id: string;
  contextType: string;
  contentSlot: string;
  slotKeys: string[];
  behaviorKeys: string[];
};

export async function listModuleTypeSummaries(): Promise<ModuleTypeSummary[]> {
  const defs = await listContentDir(MODULES_DIR);
  const rows: ModuleTypeSummary[] = [];
  for (const def of defs) {
    try {
      const json = (await readContentFile(MODULES_DIR, def.id)) as Record<string, unknown>;
      rows.push({
        id: def.id,
        contextType: typeof json.contextType === "string" ? json.contextType : "unknown",
        contentSlot: typeof json.contentSlot === "string" ? json.contentSlot : "",
        slotKeys:
          json.slots && typeof json.slots === "object"
            ? Object.keys(json.slots as object).sort()
            : [],
        behaviorKeys:
          json.behavior && typeof json.behavior === "object"
            ? Object.keys(json.behavior as object).sort()
            : [],
      });
    } catch {}
  }
  return rows.sort((a, b) => a.id.localeCompare(b.id));
}

export async function explainModuleTypeSummary(id: string): Promise<{
  id: string;
  schema: { rootFields: string[] };
  module: ModuleTypeSummary;
} | null> {
  const all = await listModuleTypeSummaries();
  const found = all.find((m) => m.id === id);
  if (!found) return null;
  return {
    id,
    schema: { rootFields: shapeKeys(moduleBlockSchema as unknown as AnySchema) },
    module: found,
  };
}

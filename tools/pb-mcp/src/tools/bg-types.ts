import { bgBlockSchema } from "@pb/contracts";

type AnySchema = {
  options?: AnySchema[];
  shape?: Record<string, AnySchema>;
  def?: { shape?: Record<string, AnySchema>; values?: unknown[] | Set<unknown>; type?: string };
};

function fieldType(schema: AnySchema): string {
  return schema.def?.type ?? "unknown";
}

export type BgTypeSummary = {
  type: string;
  rootFields: string[];
  fieldTypes: Record<string, string>;
};

export function listBgTypeSummaries(): BgTypeSummary[] {
  const options = ((bgBlockSchema as unknown as AnySchema).options ?? []) as AnySchema[];
  return options
    .map((option) => {
      const shape = option.shape ?? option.def?.shape ?? {};
      const values = (shape.type?.def?.values as unknown[] | Set<unknown> | undefined) ?? [];
      const type =
        values instanceof Set ? String([...values][0]) : String((values as unknown[])[0]);
      const rootFields = Object.keys(shape)
        .filter((key) => key !== "type")
        .sort((a, b) => a.localeCompare(b));
      return {
        type,
        rootFields,
        fieldTypes: Object.fromEntries(
          rootFields.map((key) => [key, fieldType(shape[key] as AnySchema)])
        ),
      };
    })
    .filter((row) => row.type && row.type !== "undefined")
    .sort((a, b) => a.type.localeCompare(b.type));
}

export function explainBgTypeSummary(type: string): BgTypeSummary | null {
  return listBgTypeSummaries().find((row) => row.type === type) ?? null;
}

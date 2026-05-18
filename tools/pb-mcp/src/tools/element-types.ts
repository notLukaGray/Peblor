import { elementBlockSchema } from "@pb/contracts";

type AnySchema = {
  options?: AnySchema[];
  shape?: Record<string, AnySchema>;
  def?: { shape?: Record<string, AnySchema>; values?: unknown[] | Set<unknown>; type?: string };
};

function fieldType(schema: AnySchema): string {
  return schema.def?.type ?? "unknown";
}

export type ElementTypeSummary = {
  type: string;
  rootFields: string[];
  fieldTypes: Record<string, string>;
  restrictions: string[];
};

export function listElementTypeSummaries(): ElementTypeSummary[] {
  const options = ((elementBlockSchema as unknown as AnySchema).options ?? []) as AnySchema[];
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
        restrictions: [
          "whileHover and whileTap are nested under motion, not root-level fields",
          "actions must use payload objects where required by triggerActionSchema",
        ],
      };
    })
    .filter((row) => row.type && row.type !== "undefined")
    .sort((a, b) => a.type.localeCompare(b.type));
}

export function explainElementTypeSummary(type: string): ElementTypeSummary | null {
  return listElementTypeSummaries().find((row) => row.type === type) ?? null;
}

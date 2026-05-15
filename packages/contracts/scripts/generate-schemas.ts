import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  peblorSchema,
  sectionBlockSchema,
  elementBlockSchema,
  moduleBlockSchema,
  formFieldBlockSchema,
  peblorDefinitionBlockSchema,
} from "../src/index";
import {
  importerCapabilitySchema,
  exporterCapabilitySchema,
  cmsAdapterCapabilitySchema,
} from "../src/capability-schemas";
import { CONTRACT_VERSION } from "../src/version";

const outDir = path.join(process.cwd(), "dist", "schemas");

type SchemaEntry = {
  file: string;
  schema: z.ZodTypeAny;
};

const schemaEntries: SchemaEntry[] = [
  { file: "peblor.schema.json", schema: peblorSchema },
  { file: "section.schema.json", schema: sectionBlockSchema },
  { file: "element.schema.json", schema: elementBlockSchema },
  { file: "module.schema.json", schema: moduleBlockSchema },
  { file: "form-field.schema.json", schema: formFieldBlockSchema },
  { file: "definition-block.schema.json", schema: peblorDefinitionBlockSchema },
  { file: "capability-importer.schema.json", schema: importerCapabilitySchema },
  { file: "capability-exporter.schema.json", schema: exporterCapabilitySchema },
  { file: "capability-cms-adapter.schema.json", schema: cmsAdapterCapabilitySchema },
];

fs.mkdirSync(outDir, { recursive: true });

for (const entry of schemaEntries) {
  const jsonSchema = z.toJSONSchema(entry.schema, {
    target: "draft-2020-12",
    unrepresentable: "any",
    cycles: "ref",
  });

  const output = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `@pb/contracts/${CONTRACT_VERSION}/${entry.file}`,
    ...jsonSchema,
  };

  const outPath = path.join(outDir, entry.file);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n", "utf8");
  process.stdout.write(`wrote ${path.relative(process.cwd(), outPath)}\n`);
}

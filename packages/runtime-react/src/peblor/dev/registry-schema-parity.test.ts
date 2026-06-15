/**
 * B-3: Registry / Zod-union parity test.
 *
 * Asserts that every member of the Zod discriminated unions for elements,
 * sections, and bg types has a corresponding entry in the client-side component
 * registries, and that no phantom types exist in the registries that the schema
 * does not know about.
 *
 * Without this test the registries and schema can silently drift: a new type
 * added to the Zod union compiles fine but fails at render time when the
 * runtime looks up an undefined component, and vice-versa a registry key
 * without a schema entry will never validate.
 */
import { describe, expect, it } from "vitest";
import { elementBlockSchema, sectionBlockSchema, bgBlockSchema } from "@pb/contracts";
import { ELEMENT_COMPONENTS } from "@/peblor/elements";
import { SECTION_COMPONENTS } from "@/peblor/section";
import { BG_COMPONENTS } from "@/peblor/background";

/**
 * Extract the literal type-string value from each option in a Zod
 * discriminated union.  Options wrapped in `.refine()` are `ZodEffects`;
 * their inner schema is accessible via `._def.schema`.
 */
function extractUnionTypeStrings(schema: { options: readonly unknown[] }): string[] {
  return schema.options.map((option) => {
    const s = option as {
      shape?: { type?: { value?: string } };
      _def?: { schema?: { shape?: { type?: { value?: string } } } };
    };
    const direct = s.shape?.type?.value;
    if (direct) return direct;
    // ZodEffects wraps a refined schema — unwrap one level
    const wrapped = s._def?.schema?.shape?.type?.value;
    if (wrapped) return wrapped;
    return "unknown";
  });
}

describe("B-3: client registry ↔ Zod union parity", () => {
  it("every elementBlockSchema union member has an ELEMENT_COMPONENTS entry", () => {
    const schemaTypes = extractUnionTypeStrings(elementBlockSchema);
    const missing = schemaTypes.filter((t) => !(t in ELEMENT_COMPONENTS));
    expect(
      missing,
      `Elements in Zod union but missing from ELEMENT_COMPONENTS: ${missing.join(", ")}`
    ).toEqual([]);
  });

  it("every ELEMENT_COMPONENTS key is present in elementBlockSchema", () => {
    const schemaTypes = new Set(extractUnionTypeStrings(elementBlockSchema));
    const phantom = Object.keys(ELEMENT_COMPONENTS).filter((k) => !schemaTypes.has(k));
    expect(
      phantom,
      `Phantom keys in ELEMENT_COMPONENTS not in Zod union: ${phantom.join(", ")}`
    ).toEqual([]);
  });

  it("every sectionBlockSchema union member has a SECTION_COMPONENTS entry", () => {
    const schemaTypes = extractUnionTypeStrings(sectionBlockSchema);
    const missing = schemaTypes.filter((t) => !(t in SECTION_COMPONENTS));
    expect(
      missing,
      `Sections in Zod union but missing from SECTION_COMPONENTS: ${missing.join(", ")}`
    ).toEqual([]);
  });

  it("every SECTION_COMPONENTS key is present in sectionBlockSchema", () => {
    const schemaTypes = new Set(extractUnionTypeStrings(sectionBlockSchema));
    const phantom = Object.keys(SECTION_COMPONENTS).filter((k) => !schemaTypes.has(k));
    expect(
      phantom,
      `Phantom keys in SECTION_COMPONENTS not in Zod union: ${phantom.join(", ")}`
    ).toEqual([]);
  });

  it("every bgBlockSchema union member has a BG_COMPONENTS entry", () => {
    const schemaTypes = extractUnionTypeStrings(bgBlockSchema);
    const missing = schemaTypes.filter((t) => !(t in BG_COMPONENTS));
    expect(
      missing,
      `Bg types in Zod union but missing from BG_COMPONENTS: ${missing.join(", ")}`
    ).toEqual([]);
  });

  it("every BG_COMPONENTS key is present in bgBlockSchema", () => {
    const schemaTypes = new Set(extractUnionTypeStrings(bgBlockSchema));
    const phantom = Object.keys(BG_COMPONENTS).filter((k) => !schemaTypes.has(k));
    expect(
      phantom,
      `Phantom keys in BG_COMPONENTS not in Zod union: ${phantom.join(", ")}`
    ).toEqual([]);
  });
});

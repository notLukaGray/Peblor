const ANNOTATION_REGEX_GLOBAL = /\[pb:\s*([^\]]+)\]/gi;

/** Strip `[pb: ...]` blocks from a layer name (same rules as the export plugin). */
export function stripAnnotations(name: string): string {
  return name
    .replace(ANNOTATION_REGEX_GLOBAL, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

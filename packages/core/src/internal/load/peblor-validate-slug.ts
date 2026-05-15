// Reserved slug segments that cannot be used as page names
const RESERVED_SEGMENTS: string[] = ["mobile", "desktop"];

export function validateSlugSegments(segments: string[]): void {
  for (const segment of segments) {
    if ((RESERVED_SEGMENTS as readonly string[]).includes(segment)) {
      throw new Error(
        `Slug segment "${segment}" is reserved and cannot be used as a page name. ` +
          `Reserved segments: ${RESERVED_SEGMENTS.join(", ")}`
      );
    }
  }
}

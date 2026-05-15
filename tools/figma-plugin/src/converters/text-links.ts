/**
 * Hyperlink segment extraction from TextNodes.
 */

/**
 * Describes a substring of a TextNode that carries a hyperlink.
 */
export interface TextLinkSegment {
  characters: string;
  href: string;
  external: boolean;
}

/**
 * Extracts hyperlinked text segments from a Figma text node.
 * Returns an array of link descriptors, or empty array if none.
 */
export function extractTextLinks(node: TextNode): TextLinkSegment[] {
  try {
    type Segment = {
      characters: string;
      hyperlink: { type: "URL" | "NODE"; value: string } | null;
    };
    const segments = node.getStyledTextSegments(["hyperlink"]) as Segment[];

    return segments
      .filter(
        (s): s is Segment & { hyperlink: NonNullable<Segment["hyperlink"]> } => s.hyperlink !== null
      )
      .map((s) => {
        const link = s.hyperlink;
        return {
          characters: s.characters,
          href: link.type === "URL" ? link.value : `#${link.value}`,
          external: link.type === "URL",
        };
      });
  } catch {
    return [];
  }
}

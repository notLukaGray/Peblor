/**
 * Extracts peblor-relevant properties from a Figma INSTANCE node's
 * componentProperties.
 */

export interface ExtractedComponentProps {
  label?: string;
  href?: string;
  disabled?: boolean;
  hidden?: boolean;
  variant?: string;
  size?: string;
  src?: string;
  alt?: string;
  poster?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  [key: string]: unknown;
}

function normalizePropKey(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function hasKey(candidates: Set<string>, ...keys: string[]): boolean {
  return keys.some((key) => candidates.has(key));
}

/**
 * Extracts peblor-relevant properties from a Figma INSTANCE node's
 * componentProperties. Normalizes common property name variations.
 *
 * Maps:
 *   - "label", "text", "title", "copy" (TEXT) → label
 *   - "href", "url", "link" (TEXT) → href
 *   - "disabled" (BOOLEAN) → disabled
 *   - "hidden", "visible" — "visible" is inverted → hidden
 *   - "variant" (VARIANT or TEXT) → variant
 *   - "size" (TEXT or VARIANT) → size
 *   - "src", "source", "video" (TEXT) → src
 *   - "alt", "altText", "description" (TEXT) → alt
 *   - "poster" (TEXT) → poster
 *   - "autoplay", "loop", "muted", "controls" (BOOLEAN) → boolean fields
 */
export function extractComponentProps(node: InstanceNode): ExtractedComponentProps {
  const result: ExtractedComponentProps = {};

  if (!("componentProperties" in node)) return result;

  const props = node.componentProperties;
  if (!props) return result;

  for (const [rawKey, prop] of Object.entries(props)) {
    const baseKey = rawKey.split("#")[0] ?? rawKey;
    const keyCandidates = new Set([normalizePropKey(rawKey), normalizePropKey(baseKey)]);
    const value = prop.value;

    // Preserve all raw/base overrides for downstream consumers that want the full
    // component property map, not only the canonical subset below.
    result[rawKey] = value;
    if (baseKey && !Object.prototype.hasOwnProperty.call(result, baseKey)) {
      result[baseKey] = value;
    }

    if (
      hasKey(keyCandidates, "label", "text", "title", "copy", "characters", "buttontext") &&
      prop.type === "TEXT"
    ) {
      result.label = String(value);
    }
    if (hasKey(keyCandidates, "href", "url", "link", "linkurl") && prop.type === "TEXT") {
      result.href = String(value);
    }
    if (hasKey(keyCandidates, "disabled") && prop.type === "BOOLEAN") {
      result.disabled = Boolean(value);
    }
    if (hasKey(keyCandidates, "hidden") && prop.type === "BOOLEAN") {
      result.hidden = Boolean(value);
    }
    if (hasKey(keyCandidates, "visible") && prop.type === "BOOLEAN") {
      if (result.hidden === undefined) {
        result.hidden = !Boolean(value);
      }
    }
    if (
      hasKey(keyCandidates, "variant", "state") &&
      (prop.type === "VARIANT" || prop.type === "TEXT")
    ) {
      result.variant = String(value);
    }
    if (hasKey(keyCandidates, "size") && (prop.type === "VARIANT" || prop.type === "TEXT")) {
      result.size = String(value);
    }
    if (hasKey(keyCandidates, "src", "source", "video") && prop.type === "TEXT") {
      result.src = String(value);
    }
    if (hasKey(keyCandidates, "alt", "alttext", "description") && prop.type === "TEXT") {
      result.alt = String(value);
    }
    if (hasKey(keyCandidates, "poster") && prop.type === "TEXT") {
      result.poster = String(value);
    }
    if (hasKey(keyCandidates, "autoplay", "loop", "muted", "controls") && prop.type === "BOOLEAN") {
      for (const boolKey of ["autoplay", "loop", "muted", "controls"] as const) {
        if (hasKey(keyCandidates, boolKey)) {
          result[boolKey] = Boolean(value);
        }
      }
    }
  }

  return result;
}

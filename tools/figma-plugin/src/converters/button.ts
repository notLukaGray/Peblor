/**
 * Button detection and conversion.
 * Detects COMPONENT/INSTANCE/FRAME nodes that are interactive buttons
 * and converts them to `elementButton` blocks.
 */

import type { ElementButton } from "../types/peblor";
import type { ConversionContext } from "../types/figma-plugin";
import { stripAnnotations, parseTriggerShorthand } from "./annotations";
import { extractLayoutProps } from "./layout";
import { slugify, ensureUniqueId } from "../utils/slugify";

function isTextNodeSafe(node: SceneNode): node is TextNode {
  return node.type === "TEXT";
}

function hasChildrenSafe(node: SceneNode): node is SceneNode & { children: readonly SceneNode[] } {
  return "children" in node && Array.isArray((node as { children?: unknown }).children);
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

const BUTTON_NAME_RE = /\b(button|btn|cta)\b/i;
const BUTTON_PREFIX_RE = /^(btn-|button-|cta-)/i;

/**
 * Returns true if a node should be treated as an `elementButton`.
 *
 * Criteria (any of):
 * - Has [pb: type=button] annotation
 * - Is a COMPONENT or INSTANCE with name containing "button", "btn", or "cta" (case-insensitive)
 * - Is a FRAME/COMPONENT/INSTANCE with name starting with "btn-", "button-", or "cta-"
 */
export function isLikelyButton(node: SceneNode, annotations: Record<string, string>): boolean {
  if (annotations.type === "button") return true;

  const cleanName = stripAnnotations(node.name || "");

  if (node.type === "COMPONENT" || node.type === "INSTANCE") {
    if (BUTTON_NAME_RE.test(cleanName)) return true;
  }

  if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE") {
    if (BUTTON_PREFIX_RE.test(cleanName)) return true;
  }

  return false;
}

/** `meta.figma.inference` when the button mapping came from naming/heuristics, not `[pb: type=button]`. */
export function inferButtonInferenceMeta(
  node: SceneNode,
  annotations: Record<string, string>
): { kind: "elementButton"; confidence: "medium"; detail?: string } | null {
  if (annotations.type === "button") return null;
  if (!isLikelyButton(node, annotations)) return null;
  return { kind: "elementButton", confidence: "medium", detail: "naming-convention" };
}

// ---------------------------------------------------------------------------
// Label / href extraction helpers
// ---------------------------------------------------------------------------

/**
 * Recursively walks children of a node to find the first TEXT node.
 * Returns its `characters`, or `undefined` if none found.
 */
function findFirstTextCharacters(node: SceneNode): string | undefined {
  if (isTextNodeSafe(node)) {
    return node.characters;
  }

  if (hasChildrenSafe(node)) {
    for (const child of node.children as SceneNode[]) {
      const found = findFirstTextCharacters(child);
      if (found !== undefined) return found;
    }
  }

  return undefined;
}

/**
 * Extracts the button label from the first TEXT descendant.
 * Falls back to the cleaned layer name if no text child found.
 */
function extractButtonLabel(node: SceneNode, annotations: Record<string, string>): string {
  // Allow explicit label override via annotation
  if (annotations.label) return annotations.label;

  const fromText = findFirstTextCharacters(node);
  if (fromText !== undefined && fromText.trim().length > 0) {
    return fromText.trim();
  }

  return stripAnnotations(node.name || "button").trim() || "button";
}

/**
 * Extracts href from annotations or from the first TEXT child that has a hyperlink.
 */
function extractButtonHref(
  node: SceneNode,
  annotations: Record<string, string>
): string | undefined {
  if (annotations.href) return annotations.href;

  // Walk children looking for a TEXT node with a URL hyperlink
  function walkForHyperlink(n: SceneNode): string | undefined {
    if (isTextNodeSafe(n)) {
      const hl = n.hyperlink;
      if (hl && typeof hl === "object" && "type" in hl) {
        const h = hl as { type: string; value: string };
        if (h.type === "URL") return h.value;
      }
    }
    if (hasChildrenSafe(n)) {
      for (const child of n.children as SceneNode[]) {
        const found = walkForHyperlink(child);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  }

  return walkForHyperlink(node);
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

/**
 * Converts a node to an `elementButton`.
 *
 * - Label: extracted from first TEXT descendant or cleaned layer name.
 * - Href: from [pb: href=...] annotation or first child TEXT hyperlink.
 * - Action: from [pb: action=actionType:param] annotation.
 * - Layout props from `extractLayoutProps`.
 * - `pointerDownAction` wired from `annotations.action` if present.
 */
export async function convertButtonNode(
  node: SceneNode,
  ctx: ConversionContext,
  annotations: Record<string, string>
): Promise<ElementButton> {
  const cleanName = stripAnnotations(node.name || "button");
  const id = ensureUniqueId(slugify(cleanName || "button"), ctx.usedIds);
  const layout = extractLayoutProps(node);
  const label = extractButtonLabel(node, annotations);
  const href = extractButtonHref(node, annotations);

  const result: ElementButton = {
    type: "elementButton",
    id,
    label,
    ...layout,
    ...(href ? { href } : {}),
    ...(annotations.variant ? { variant: annotations.variant } : {}),
    ...(annotations.size ? { size: annotations.size } : {}),
    ...(annotations.disabled === "true" ? { disabled: true } : {}),
  };

  // Wire action annotation
  if (annotations.action) {
    const action = parseTriggerShorthand(annotations.action);
    if (action) {
      result.pointerDownAction = action;
    }
  }

  return result;
}

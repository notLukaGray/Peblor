/**
 * Heuristics for media / control element kinds (prefer Figma naming over annotations).
 */

import { stripAnnotations } from "./annotations-parse";

const VIDEO_NAME_HINT_RE =
  /\b(mp4|webm|mov|ogg|trailer|reel|playback|player|videofile|media-player)\b/i;

const IMAGE_MEDIA_NAME_HINT_RE =
  /\b(poster|thumbnail|thumb(nail)?|cover(\s|-)?image|hero(\s|-)?image|bg-?image|photo|picture|splash)\b/i;

/** Heuristic: layer name suggests video content (used with fills / instance props). */
export function nameSuggestsVideo(rawName: string): boolean {
  const trimmed = stripAnnotations(rawName).trim();
  const n = trimmed.toLowerCase();
  if (n.startsWith("video") || n.startsWith("vid-") || n.startsWith("vid_")) return true;
  return VIDEO_NAME_HINT_RE.test(n);
}

/** Heuristic: layer name suggests raster / hero imagery (image fill routing is separate). */
export function nameSuggestsImageMedia(rawName: string): boolean {
  return IMAGE_MEDIA_NAME_HINT_RE.test(stripAnnotations(rawName).toLowerCase());
}

/** `meta.figma.inference` when an image element was produced without `[pb: type=image]`. */
export function inferImageInferenceMeta(
  node: SceneNode,
  annotations: Record<string, string>
): { kind: "elementImage"; confidence: "high" | "medium"; detail: string } | null {
  if (annotations.type === "image") return null;
  if (nameSuggestsImageMedia(node.name || "")) {
    return { kind: "elementImage", confidence: "medium", detail: "layer-name" };
  }
  return { kind: "elementImage", confidence: "high", detail: "image-fill" };
}

export function isLikelyScrollProgressBarNode(node: SceneNode): boolean {
  const raw = stripAnnotations(node.name || "").toLowerCase();
  if (!/\b(progress|scroll-bar|scrollbar|scrubber|scrollprogress)\b/.test(raw)) {
    return false;
  }
  if (!("width" in node) || !("height" in node)) return false;
  return node.width > node.height * 1.5 && node.height <= 64;
}

export function isLikelyRiveComponentName(mainComponentName: string): boolean {
  const n = mainComponentName.toLowerCase();
  return /\brive\b/.test(n) || n.includes(".riv");
}

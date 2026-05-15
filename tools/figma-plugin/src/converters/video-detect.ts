/**
 * Video node detection: heuristics for identifying video-like SceneNodes.
 */

import { extractComponentProps } from "./component-props";
import { nameSuggestsVideo } from "./element-media-detect";

/**
 * Returns true if the fills array contains a Figma-native VIDEO fill paint.
 */
export function hasVideoFill(
  fills: readonly Paint[] | typeof figma.mixed | null | undefined
): boolean {
  if (!Array.isArray(fills)) return false;
  return fills.some((f) => f.visible !== false && (f as Paint & { type: string }).type === "VIDEO");
}

/**
 * When `isVideoNode` matched without explicit video type annotation, describes inference for `meta.figma.inference`.
 */
export function inferVideoInferenceMeta(
  node: SceneNode,
  annotations: Record<string, string>
): { kind: "elementVideo"; confidence: "high" | "medium" | "low"; detail?: string } | null {
  if (annotations.type === "elementVideo" || annotations.type === "video") return null;

  if ("fills" in node) {
    const fills = (node as SceneNode & { fills?: readonly Paint[] | typeof figma.mixed }).fills;
    if (fills && hasVideoFill(fills)) {
      return { kind: "elementVideo", confidence: "high", detail: "video-fill" };
    }
  }

  if (node.type === "INSTANCE") {
    const props = extractComponentProps(node as InstanceNode);
    if (props.src && /\.(mp4|webm|mov|ogg)(\?|$)/i.test(props.src)) {
      return { kind: "elementVideo", confidence: "high", detail: "instance-src" };
    }
  }

  if (nameSuggestsVideo(node.name || "")) {
    return { kind: "elementVideo", confidence: "medium", detail: "layer-name" };
  }

  return { kind: "elementVideo", confidence: "low", detail: "heuristic-fallback" };
}

/**
 * Returns true if a node should be treated as an `elementVideo`.
 *
 * Detection rules (any of):
 * 1. `[pb: type=elementVideo]` or `[pb: type=video]` annotation
 * 2. Has a Figma-native VIDEO fill
 * 3. Node name matches video-oriented naming heuristics
 * 4. INSTANCE whose component property `src` points to a video URL
 */
export function isVideoNode(node: SceneNode, annotations: Record<string, string>): boolean {
  if (annotations.type === "elementVideo" || annotations.type === "video") return true;

  if ("fills" in node) {
    const fills = (node as SceneNode & { fills?: readonly Paint[] | typeof figma.mixed }).fills;
    if (fills && hasVideoFill(fills)) return true;
  }

  if (nameSuggestsVideo(node.name || "")) return true;

  if (node.type === "INSTANCE") {
    const props = extractComponentProps(node as InstanceNode);
    if (props.src && /\.(mp4|webm|mov|ogg)(\?|$)/i.test(props.src)) return true;
  }

  return false;
}

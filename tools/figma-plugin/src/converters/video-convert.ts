/**
 * convertVideoNode — converts a video-like SceneNode to an elementVideo block.
 *
 * src is derived from the clean layer name using buildAssetKey with .mp4 extension,
 * or from an explicit [pb: src=…] annotation or component property.
 * poster is exported as PNG, or derived as a CDN key in copy-JSON mode.
 */

import type { ConversionContext } from "../types/figma-plugin";
import type { ElementBlock, ElementVideo } from "../types/peblor";
import { parseAnnotations, stripAnnotations, annotationFlag } from "./annotations";
import { extractLayoutProps } from "./layout";
import { slugify, ensureUniqueId } from "../utils/slugify";
import { toPx } from "../utils/css";
import { buildAssetKey } from "../utils/asset-key";
import { extractComponentProps } from "./component-props";
import { hasVideoFill } from "./video-detect";

export async function convertVideoNode(
  node: SceneNode,
  ctx: ConversionContext,
  annotations: Record<string, string>
): Promise<ElementBlock> {
  const ann = Object.keys(annotations).length > 0 ? annotations : parseAnnotations(node.name || "");

  const cleanName = stripAnnotations(node.name || "video");
  const id = ensureUniqueId(slugify(cleanName), ctx.usedIds);
  const layout = extractLayoutProps(node);
  const compProps = node.type === "INSTANCE" ? extractComponentProps(node as InstanceNode) : {};

  // src — explicit annotation > component property > layer name as CDN key
  let src: string;
  if (ann.src) {
    src = ann.src;
  } else if (compProps.src) {
    src = compProps.src;
  } else {
    const assetKey = buildAssetKey(cleanName, ctx, ".mp4");
    src = assetKey.cdnKey;
  }

  // poster — explicit annotation > component property > export as PNG > CDN key
  let poster: string | undefined;
  if (ann.poster) {
    poster = ann.poster;
  } else if (compProps.poster) {
    poster = compProps.poster as string;
  } else if (ctx.skipAssets) {
    poster = buildAssetKey(`${cleanName}/poster`, ctx, ".png").cdnKey;
  } else {
    try {
      const bytes = await (node as ExportMixin).exportAsync({
        format: "PNG",
        constraint: { type: "SCALE", value: 1 },
      });
      const posterKey = buildAssetKey(`${cleanName}/poster`, ctx, ".png");
      ctx.assets.push({ filename: posterKey.filename, data: new Uint8Array(bytes) });
      poster = posterKey.cdnKey;
    } catch (err) {
      ctx.warnings.push(`[video] Could not export poster for "${node.name}": ${String(err)}`);
    }
  }

  // Playback flags — default to silent background loop when no annotations are set
  const hasAutoplayAnn = ann.autoplay !== undefined;
  const hasLoopAnn = ann.loop !== undefined;
  const hasMutedAnn = ann.muted !== undefined;
  const anyAnnotated = hasAutoplayAnn || hasLoopAnn || hasMutedAnn;

  const autoplay = hasAutoplayAnn ? annotationFlag(ann, "autoplay") : !anyAnnotated;
  const loop = hasLoopAnn ? annotationFlag(ann, "loop") : !anyAnnotated;
  const muted = hasMutedAnn ? annotationFlag(ann, "muted") : !anyAnnotated;

  const showPlayButton =
    ann.showplaybutton !== undefined ? annotationFlag(ann, "showplaybutton") : undefined;

  const objectFit = ann.objectfit as ElementVideo["objectFit"] | undefined;
  const module_ = ann.module || undefined;

  // Warn when src is derived from layer name (cannot verify CDN path)
  const nodeHasVideoFill =
    "fills" in node &&
    !!(node as SceneNode & { fills?: readonly Paint[] }).fills &&
    hasVideoFill((node as SceneNode & { fills: readonly Paint[] }).fills);

  if (!ann.src && !compProps.src) {
    if (nodeHasVideoFill) {
      ctx.warnings.push(
        `[video] "${node.name}" has a Figma video fill but video files cannot be exported via the plugin API. ` +
          `Set src manually in the output JSON or use [pb: src=path/to/video.mp4] annotation.`
      );
    }
    ctx.warnings.push(
      `[video] "${node.name}" — src derived from layer name as "${src}". ` +
        `Verify this matches the CDN key, or set [pb: src=…] explicitly.`
    );
  }

  const nodeWidth = "width" in node ? (node as { width: number }).width : 640;
  const nodeHeight = "height" in node ? (node as { height: number }).height : 360;

  const result: ElementVideo = {
    type: "elementVideo",
    id,
    src,
    ...(poster !== undefined ? { poster } : {}),
    autoplay,
    loop,
    muted,
    ...(showPlayButton !== undefined ? { showPlayButton } : {}),
    ...(objectFit ? { objectFit } : {}),
    ...(module_ ? { module: module_ } : {}),
    width: toPx(nodeWidth),
    height: toPx(nodeHeight),
    ...layout,
  };

  return result as unknown as ElementBlock;
}

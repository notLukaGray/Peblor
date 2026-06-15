import { preload } from "react-dom";
import { normalizeImageTransformParams } from "@pb/core/lib/cdn-image-params";
import { buildProxyUrl } from "@pb/core/lib/proxy-url";

type ResourceHintAs = "image";

export type PageResourceHint = {
  url: string;
  as: ResourceHintAs;
  fetchPriority?: "high" | "low" | "auto";
};

export function applyPageResourceHints(hints: PageResourceHint[]): void {
  for (const hint of hints) {
    preload(hint.url, {
      as: hint.as,
      ...(hint.fetchPriority ? { fetchPriority: hint.fetchPriority } : {}),
    });
  }
}

function isPreloadableUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return false;
  return trimmed.startsWith("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

function pushHint(
  hints: PageResourceHint[],
  seen: Set<string>,
  url: unknown,
  as: ResourceHintAs,
  fetchPriority?: PageResourceHint["fetchPriority"]
): void {
  if (!isPreloadableUrl(url)) return;
  const normalized = toPreloadUrl(url.trim(), as);
  const key = `${as}:${normalized}`;
  if (seen.has(key)) return;
  seen.add(key);
  hints.push({ url: normalized, as, fetchPriority });
}

function toPreloadUrl(url: string, as: ResourceHintAs): string {
  if (as !== "image") return url;
  if (!url.startsWith("/api/media/")) return url;

  try {
    const parsed = new URL(url, "http://localhost");
    const key = parsed.pathname.replace(/^\/api\/media\/+/, "");
    if (!key) return url;

    const input: Record<string, string> = {};
    for (const field of [
      "width",
      "w",
      "quality",
      "q",
      "height",
      "format",
      "aspect_ratio",
      "class",
    ]) {
      const value = parsed.searchParams.get(field);
      if (value != null) input[field] = value;
    }

    const transforms = normalizeImageTransformParams(
      Object.keys(input).length > 0 ? input : undefined
    );

    return buildProxyUrl(key, transforms);
  } catch (err) {
    console.warn("[web-core] Failed to rewrite image URL for resource hints", err);
    return url;
  }
}

function isHidden(node: Record<string, unknown>): boolean {
  if (node.hidden === true) return true;
  if (node.visibleWhen != null) return true;
  return false;
}

function walkMediaHints(
  node: unknown,
  hints: PageResourceHint[],
  seen: Set<string>,
  depth = 0
): void {
  if (node == null || depth > 12) return;
  if (Array.isArray(node)) {
    for (const item of node) walkMediaHints(item, hints, seen, depth + 1);
    return;
  }
  if (typeof node !== "object") return;

  const record = node as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type : undefined;
  const priority = record.priority === true ? "high" : undefined;

  // Skip hidden or conditionally-visible sections/elements
  if (type && isHidden(record)) return;

  // For revealSection, only walk the collapsed (initially visible) branch
  if (type === "revealSection") {
    const initialRevealed = record.initialRevealed === true;
    const collapsed = record.collapsedElements;
    const revealed = record.revealedElements;
    if (Array.isArray(collapsed)) {
      walkMediaHints(collapsed, hints, seen, depth + 1);
    }
    if (initialRevealed && Array.isArray(revealed)) {
      walkMediaHints(revealed, hints, seen, depth + 1);
    }
    // Still walk other top-level fields (like background) but skip elements arrays
    for (const [key, value] of Object.entries(record)) {
      if (key === "collapsedElements" || key === "revealedElements" || key === "elements") continue;
      walkMediaHints(value, hints, seen, depth + 1);
    }
    return;
  }

  if (type === "elementImage") pushHint(hints, seen, record.src, "image", priority);
  if (type === "elementVideo") {
    pushHint(hints, seen, record.poster, "image", priority);
  }
  if (type === "backgroundImage" || type === "backgroundPattern") {
    pushHint(hints, seen, record.image, "image", "high");
  }
  if (type === "backgroundVideo") {
    pushHint(hints, seen, record.poster, "image", "high");
  }

  for (const [key, value] of Object.entries(record)) {
    // Don't recurse into sections/elements that have their own visibleWhen
    if (key === "visibleWhen") continue;
    walkMediaHints(value, hints, seen, depth + 1);
  }
}

export function collectInitialPageResourceHints(input: {
  resolvedBg?: unknown;
  resolvedSections?: unknown[];
  overlaySections?: unknown[];
  maxHints?: number;
}): PageResourceHint[] {
  const hints: PageResourceHint[] = [];
  const seen = new Set<string>();
  const maxHints = input.maxHints ?? 8;
  const candidates = [
    input.resolvedBg,
    ...(input.overlaySections ?? []),
    ...(input.resolvedSections ?? []).slice(0, 4),
  ];

  for (const candidate of candidates) {
    walkMediaHints(candidate, hints, seen);
    if (hints.length >= maxHints) return hints.slice(0, maxHints);
  }

  return hints;
}

"use client";

import {
  useEffect,
  useState,
  useRef,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
  type RefObject,
} from "react";
import type { BunnyFontMeta } from "@/app/dev/fonts/page";

function injectFontLink(href: string): void {
  const id = `bunny-link-${encodeURIComponent(href)}`;
  if (document.getElementById(id)) return;
  const l = document.createElement("link");
  l.id = id;
  l.rel = "stylesheet";
  l.href = href;
  document.head.appendChild(l);
}

function wghtPreviewStyle(fontFamilyCss: string, w: number, variableFace: boolean): CSSProperties {
  const s: CSSProperties = { fontFamily: fontFamilyCss, fontWeight: w };
  if (variableFace) {
    s.fontVariationSettings = `"wght" ${w}`;
  }
  return s;
}

function pickPreviewWeight(weights: number[]): number {
  if (!weights.length) return 400;
  if (weights.includes(400)) return 400;
  return weights.reduce((best, w) => (Math.abs(w - 400) < Math.abs(best - 400) ? w : best));
}

function getCatalogStyleSummary(styles: string[]): {
  hasNormal: boolean;
  hasItalic: boolean;
  styleCount: number;
} {
  const hasNormal = styles.includes("normal");
  const hasItalic = styles.includes("italic");
  const styleCount = Math.max(Number(hasNormal) + Number(hasItalic), Math.max(1, styles.length));
  return { hasNormal, hasItalic, styleCount };
}

function styleLabelFromFlags(hasNormal: boolean, hasItalic: boolean): string {
  if (hasNormal && hasItalic) return "normal & italic";
  return hasItalic ? "italic" : "normal";
}

function bunnyCatalogFaceSummary(meta: BunnyFontMeta): {
  faces: number;
  uniqueWeightCount: number;
  detail: string;
} | null {
  const uniqueW = [...new Set(meta.weights)].sort((a, b) => a - b);
  const uw = uniqueW.length;
  const { hasNormal, hasItalic, styleCount } = getCatalogStyleSummary(meta.styles);

  if (uw === 0) {
    if (meta.variable === true) {
      return {
        faces: styleCount,
        uniqueWeightCount: 0,
        detail: `Variable font; weight list not listed — ${styleCount} style ${styleCount === 1 ? "entry" : "entries"}.`,
      };
    }
    return null;
  }

  const faces = uw * styleCount;
  const styleLabel = styleLabelFromFlags(hasNormal, hasItalic);
  return {
    faces,
    uniqueWeightCount: uw,
    detail: `${faces} variants (${uw} weights × ${styleLabel}). Weights: ${uniqueW.join(", ")}.`,
  };
}

type FontFaceBadge = { primary: string; detail: string };

type DevLocalFace = {
  cssFamily: string;
  weights: number[];
  variable?: boolean;
  fileCount?: number;
};

function buildLocalFaceBadge(devLocalFace: DevLocalFace): FontFaceBadge {
  const fc = devLocalFace.fileCount ?? 0;
  const distinctW = new Set(devLocalFace.weights).size;
  const primary = fc > 0 ? `${fc} file${fc === 1 ? "" : "s"}` : `${distinctW}w`;
  const detail =
    fc > 0
      ? `${fc} uploaded file${fc === 1 ? "" : "s"} · ${distinctW} weight value${distinctW === 1 ? "" : "s"} guessed from file names.`
      : "Your uploaded files";
  return { primary, detail };
}

function buildCatalogFaceBadge(meta: BunnyFontMeta): FontFaceBadge {
  const summary = bunnyCatalogFaceSummary(meta);
  if (!summary) return { primary: "—", detail: "No weight info for this family" };
  return {
    primary: `${summary.faces} face${summary.faces === 1 ? "" : "s"}`,
    detail: summary.detail,
  };
}

function resolveFontFaceBadge(meta: BunnyFontMeta, devLocalFace?: DevLocalFace): FontFaceBadge {
  return devLocalFace ? buildLocalFaceBadge(devLocalFace) : buildCatalogFaceBadge(meta);
}

function resolveLoadedFamily(
  isDevLocal: boolean,
  shouldLoad: boolean,
  meta: BunnyFontMeta,
  devLocalFace?: { cssFamily: string }
): string {
  if (isDevLocal) return `'${devLocalFace!.cssFamily}', sans-serif`;
  return shouldLoad ? `'${meta.name}', sans-serif` : "inherit";
}

function resolveRowVariableFace(
  isDevLocal: boolean,
  meta: BunnyFontMeta,
  devLocalFace?: { variable?: boolean }
): boolean {
  return Boolean(isDevLocal ? devLocalFace?.variable : meta.variable);
}

function useLazyCatalogFontRowLoad({
  rowRef,
  isDevLocal,
  scrollRoot,
  shouldLoad,
  setShouldLoad,
}: {
  rowRef: RefObject<HTMLButtonElement | null>;
  isDevLocal: boolean;
  scrollRoot: HTMLUListElement | null;
  shouldLoad: boolean;
  setShouldLoad: Dispatch<SetStateAction<boolean>>;
}): void {
  useEffect(() => {
    if (isDevLocal) return;
    const el = rowRef.current;
    if (!el || !scrollRoot || shouldLoad) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldLoad(true);
        obs.disconnect();
      },
      { root: scrollRoot, rootMargin: "120px 0px", threshold: 0.01 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [isDevLocal, scrollRoot, shouldLoad, setShouldLoad, rowRef]);
}

function useInjectCatalogPreviewFace({
  isDevLocal,
  shouldLoad,
  slug,
  previewWeight,
}: {
  isDevLocal: boolean;
  shouldLoad: boolean;
  slug: string;
  previewWeight: number;
}): void {
  useEffect(() => {
    if (isDevLocal || !shouldLoad) return;
    injectFontLink(
      `https://fonts.bunny.net/css2?family=${slug}:wght@${previewWeight}&display=swap`
    );
  }, [isDevLocal, shouldLoad, slug, previewWeight]);
}

export function FontDropdownItem({
  slug,
  meta,
  sampleLine,
  scrollRoot,
  onSelect,
  devLocalFace,
}: {
  slug: string;
  meta: BunnyFontMeta;
  sampleLine: string;
  scrollRoot: HTMLUListElement | null;
  onSelect: () => void;
  devLocalFace?: DevLocalFace;
}) {
  const rowRef = useRef<HTMLButtonElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const isDevLocal = Boolean(devLocalFace);
  const previewWeight = pickPreviewWeight(isDevLocal ? devLocalFace!.weights : meta.weights);
  useLazyCatalogFontRowLoad({ rowRef, isDevLocal, scrollRoot, shouldLoad, setShouldLoad });
  useInjectCatalogPreviewFace({ isDevLocal, shouldLoad, slug, previewWeight });
  const loadedFamily = resolveLoadedFamily(isDevLocal, shouldLoad, meta, devLocalFace);
  const faceBadge = resolveFontFaceBadge(meta, devLocalFace);
  const variableFace = resolveRowVariableFace(isDevLocal, meta, devLocalFace);

  return (
    <button
      ref={rowRef}
      type="button"
      className="group w-full px-3 py-2 text-left hover:bg-muted flex gap-3 items-start"
      onMouseDown={onSelect}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <span
          className="block text-base text-foreground leading-tight"
          style={wghtPreviewStyle(loadedFamily, previewWeight, variableFace)}
        >
          {meta.name}
        </span>
        <span
          className="block text-[13px] text-muted-foreground leading-snug line-clamp-2"
          style={wghtPreviewStyle(loadedFamily, previewWeight, variableFace)}
        >
          {sampleLine}
        </span>
      </div>
      <span
        className="shrink-0 font-mono text-[10px] text-muted-foreground pt-0.5 text-right max-w-[6.25rem] leading-tight"
        title={faceBadge.detail}
      >
        <span className="block">
          {variableFace ? (
            <span className="mr-1 opacity-90" title="Variable font">
              Var
            </span>
          ) : null}
          <span>{faceBadge.primary}</span>
        </span>
        {isDevLocal ? <span className="block text-[9px] opacity-75">yours</span> : null}
      </span>
    </button>
  );
}

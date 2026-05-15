/**
 * Layout dev previews sit inside a fixed-width card. CSS `vw` still resolves against the
 * browser viewport, which misrepresents `min(90vw, 900px)` style rails. For preview-only
 * visuals, rewrite `vw` lengths using the measured inner width of the preview frame.
 */
export function replaceVwUnitsWithPreviewFrameWidth(
  css: string,
  previewInnerWidthPx: number
): string {
  if (!css || previewInnerWidthPx <= 0) return css;
  return css.replace(/(\d+(?:\.\d+)?)vw/g, (_, raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return _;
    const px = (n / 100) * previewInnerWidthPx;
    const rounded = Math.round(px * 1000) / 1000;
    return `${rounded}px`;
  });
}

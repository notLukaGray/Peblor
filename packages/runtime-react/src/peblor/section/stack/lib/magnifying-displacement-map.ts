/**
 * Radial displacement field used for magnifying-lens style glass.
 * Encodes X in R and Y in G, neutral at 128.
 */
export function calculateMagnifyingDisplacementMap(
  canvasWidth: number,
  canvasHeight: number,
  dpr?: number
): ImageData {
  const devicePixelRatio =
    dpr ?? (typeof window !== "undefined" ? (window.devicePixelRatio ?? 1) : 1);
  const bufferWidth = Math.max(1, Math.round(canvasWidth * devicePixelRatio));
  const bufferHeight = Math.max(1, Math.round(canvasHeight * devicePixelRatio));
  const imageData = new ImageData(bufferWidth, bufferHeight);

  const ratio = Math.max(bufferWidth / 2, bufferHeight / 2);

  for (let y = 0; y < bufferHeight; y++) {
    for (let x = 0; x < bufferWidth; x++) {
      const idx = (y * bufferWidth + x) * 4;
      const xNorm = (x - bufferWidth / 2) / ratio;
      const yNorm = (y - bufferHeight / 2) / ratio;

      imageData.data[idx] = 128 - xNorm * 127;
      imageData.data[idx + 1] = 128 - yNorm * 127;
      imageData.data[idx + 2] = 0;
      imageData.data[idx + 3] = 255;
    }
  }

  return imageData;
}

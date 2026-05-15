import {
  normalizeRoundedRectRadii,
  sampleRoundedRectBezel,
  type RoundedRectRadius,
} from "./rounded-rect-bezel";

/**
 * Computes a 1-D array of lateral displacement values (in CSS px) for each
 * sample along the bezel width, using Snell's law for a vertical incident ray.
 *
 * Ported from kube.io/liquid-glass-css-svg — browser-compatible (no Node canvas).
 */
export function calculateDisplacementMap(
  glassThickness: number = 200,
  bezelWidth: number = 50,
  bezelHeightFn: (x: number) => number = (x) => x,
  refractiveIndex: number = 1.5,
  samples: number = 128
): number[] {
  const eta = 1 / refractiveIndex;

  function refract(normalX: number, normalY: number): [number, number] | null {
    const dot = normalY;
    const k = 1 - eta * eta * (1 - dot * dot);
    if (k < 0) return null; // total internal reflection
    const kSqrt = Math.sqrt(k);
    return [-(eta * dot + kSqrt) * normalX, eta - (eta * dot + kSqrt) * normalY];
  }

  return Array.from({ length: samples }, (_, i) => {
    const x = i / samples;
    const y = bezelHeightFn(x);

    const dx = x < 1 ? 0.0001 : -0.0001;
    const y2 = bezelHeightFn(x + dx);
    const derivative = (y2 - y) / dx;
    const magnitude = Math.sqrt(derivative * derivative + 1);
    const normal: [number, number] = [-derivative / magnitude, -1 / magnitude];
    const refracted = refract(normal[0], normal[1]);

    if (!refracted) return 0;

    const remainingHeightOnBezel = y * bezelWidth;
    const remainingHeight = remainingHeightOnBezel + glassThickness;
    return refracted[0] * (remainingHeight / refracted[1]);
  });
}

/**
 * Generates a displacement-map ImageData for a rounded-rectangle glass element.
 * Encodes X-displacement in R channel and Y-displacement in G channel,
 * neutral = (128, 128) = no displacement.
 *
 * Browser-compatible: uses the native `ImageData` constructor.
 */
export function calculateDisplacementMap2(
  canvasWidth: number,
  canvasHeight: number,
  objectWidth: number,
  objectHeight: number,
  radius: RoundedRectRadius,
  bezelWidth: number,
  maximumDisplacement: number,
  precomputedDisplacementMap: number[] = [],
  dpr?: number
): ImageData {
  const devicePixelRatio =
    dpr ?? (typeof window !== "undefined" ? (window.devicePixelRatio ?? 1) : 1);

  const bufferWidth = Math.round(canvasWidth * devicePixelRatio);
  const bufferHeight = Math.round(canvasHeight * devicePixelRatio);
  const imageData = new ImageData(bufferWidth, bufferHeight);

  // Fill neutral: R=128, G=128, B=0, A=255
  const buf32 = new Uint32Array(imageData.data.buffer);
  // little-endian layout: [R, G, B, A] stored as 0xAABBGGRR
  buf32.fill(0xff008080);

  const radii = normalizeRoundedRectRadii(radius);
  const radii_ = {
    topLeft: radii.topLeft * devicePixelRatio,
    topRight: radii.topRight * devicePixelRatio,
    bottomRight: radii.bottomRight * devicePixelRatio,
    bottomLeft: radii.bottomLeft * devicePixelRatio,
  };
  const bezel = bezelWidth * devicePixelRatio;

  const objectWidth_ = objectWidth * devicePixelRatio;
  const objectHeight_ = objectHeight * devicePixelRatio;

  const objectX = (bufferWidth - objectWidth_) / 2;
  const objectY = (bufferHeight - objectHeight_) / 2;

  for (let y1 = 0; y1 < objectHeight_; y1++) {
    for (let x1 = 0; x1 < objectWidth_; x1++) {
      const idx = Math.round((objectY + y1) * bufferWidth + objectX + x1) * 4;

      const sample = sampleRoundedRectBezel(x1, y1, objectWidth_, objectHeight_, radii_, bezel, 1);

      if (sample) {
        const distanceFromSide = Math.max(sample.distanceFromSide, 0);
        const bezelIndex = Math.min(
          precomputedDisplacementMap.length - 1,
          Math.max(0, ((distanceFromSide / bezel) * precomputedDisplacementMap.length) | 0)
        );
        const distance = precomputedDisplacementMap[bezelIndex] ?? 0;

        const dX = (-sample.normalX * distance) / maximumDisplacement;
        const dY = (-sample.normalY * distance) / maximumDisplacement;

        imageData.data[idx] = 128 + dX * 127 * sample.opacity; // R
        imageData.data[idx + 1] = 128 + dY * 127 * sample.opacity; // G
        imageData.data[idx + 2] = 0; // B
        imageData.data[idx + 3] = 255; // A
      }
    }
  }

  return imageData;
}

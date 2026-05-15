import {
  normalizeRoundedRectRadii,
  sampleRoundedRectBezel,
  type RoundedRectRadius,
} from "./rounded-rect-bezel";

/**
 * Generates a specular-highlight ImageData for a rounded-rectangle glass element.
 * The specular ring simulates ambient light catching the inner rim of the bevel.
 *
 * Browser-compatible: uses the native `ImageData` constructor.
 * Ported from kube.io/liquid-glass-css-svg.
 */
export function calculateRefractionSpecular(
  objectWidth: number,
  objectHeight: number,
  radius: RoundedRectRadius,
  bezelWidth: number,
  specularAngle = Math.PI / 3,
  dpr?: number
): ImageData {
  const devicePixelRatio =
    dpr ?? (typeof window !== "undefined" ? (window.devicePixelRatio ?? 1) : 1);

  const bufferWidth = Math.round(objectWidth * devicePixelRatio);
  const bufferHeight = Math.round(objectHeight * devicePixelRatio);
  const imageData = new ImageData(bufferWidth, bufferHeight);

  const radii = normalizeRoundedRectRadii(radius);
  const radii_ = {
    topLeft: radii.topLeft * devicePixelRatio,
    topRight: radii.topRight * devicePixelRatio,
    bottomRight: radii.bottomRight * devicePixelRatio,
    bottomLeft: radii.bottomLeft * devicePixelRatio,
  };
  const bezel_ = bezelWidth * devicePixelRatio;

  const specular_vector: [number, number] = [Math.cos(specularAngle), Math.sin(specularAngle)];

  // Fill fully transparent
  new Uint32Array(imageData.data.buffer).fill(0x00000000);

  for (let y1 = 0; y1 < bufferHeight; y1++) {
    for (let x1 = 0; x1 < bufferWidth; x1++) {
      const idx = (y1 * bufferWidth + x1) * 4;

      const sample = sampleRoundedRectBezel(
        x1,
        y1,
        bufferWidth,
        bufferHeight,
        radii_,
        bezel_,
        devicePixelRatio
      );

      if (sample) {
        const cos = sample.normalX;
        const sin = -sample.normalY;
        const dotProduct = Math.abs(cos * specular_vector[0] + sin * specular_vector[1]);
        const edgeCoefficient = Math.max(
          0,
          1 - (1 - sample.distanceFromSide / (1 * devicePixelRatio)) ** 2
        );

        const coefficient = dotProduct * Math.sqrt(edgeCoefficient);

        const color = 255 * coefficient;
        const finalOpacity = color * coefficient * sample.opacity;

        imageData.data[idx] = color;
        imageData.data[idx + 1] = color;
        imageData.data[idx + 2] = color;
        imageData.data[idx + 3] = finalOpacity;
      }
    }
  }

  return imageData;
}

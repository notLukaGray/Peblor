export type RoundedRectCornerRadii = {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
};

export type RoundedRectRadius = number | RoundedRectCornerRadii;

export type BezelSample = {
  distanceFromSide: number;
  normalX: number;
  normalY: number;
  opacity: number;
};

const EPSILON = 0.000001;

export function normalizeRoundedRectRadii(radius: RoundedRectRadius): RoundedRectCornerRadii {
  if (typeof radius === "number") {
    return {
      topLeft: radius,
      topRight: radius,
      bottomRight: radius,
      bottomLeft: radius,
    };
  }
  return radius;
}

function normalizeVector(x: number, y: number): [number, number] {
  const length = Math.hypot(x, y);
  if (length <= EPSILON) return [0, 0];
  return [x / length, y / length];
}

function cornerNormal(corner: keyof RoundedRectCornerRadii): [number, number] {
  if (corner === "topLeft") return normalizeVector(-1, -1);
  if (corner === "topRight") return normalizeVector(1, -1);
  if (corner === "bottomRight") return normalizeVector(1, 1);
  return normalizeVector(-1, 1);
}

function sampleCorner(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  radius: number,
  bezel: number,
  antialias: number,
  corner: keyof RoundedRectCornerRadii
): BezelSample | null {
  if (radius <= 0) return null;
  const dx = x - centerX;
  const dy = y - centerY;
  const distanceToCenter = Math.hypot(dx, dy);
  const distanceFromSide = radius - distanceToCenter;
  if (distanceFromSide < -antialias || distanceFromSide > bezel) return null;

  const [fallbackX, fallbackY] = cornerNormal(corner);
  const [normalX, normalY] =
    distanceToCenter > EPSILON
      ? [dx / distanceToCenter, dy / distanceToCenter]
      : [fallbackX, fallbackY];
  const opacity =
    distanceFromSide >= 0
      ? 1
      : Math.max(0, Math.min(1, 1 + distanceFromSide / Math.max(antialias, EPSILON)));

  return {
    distanceFromSide,
    normalX,
    normalY,
    opacity,
  };
}

export function sampleRoundedRectBezel(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: RoundedRectRadius,
  bezel: number,
  antialias = 1
): BezelSample | null {
  const radii = normalizeRoundedRectRadii(radius);
  const w = Math.max(width, 0);
  const h = Math.max(height, 0);
  const aa = Math.max(antialias, 0);

  if (radii.topLeft > 0 && x < radii.topLeft && y < radii.topLeft) {
    return sampleCorner(x, y, radii.topLeft, radii.topLeft, radii.topLeft, bezel, aa, "topLeft");
  }
  if (radii.topRight > 0 && x >= w - radii.topRight && y < radii.topRight) {
    return sampleCorner(
      x,
      y,
      w - radii.topRight,
      radii.topRight,
      radii.topRight,
      bezel,
      aa,
      "topRight"
    );
  }
  if (radii.bottomRight > 0 && x >= w - radii.bottomRight && y >= h - radii.bottomRight) {
    return sampleCorner(
      x,
      y,
      w - radii.bottomRight,
      h - radii.bottomRight,
      radii.bottomRight,
      bezel,
      aa,
      "bottomRight"
    );
  }
  if (radii.bottomLeft > 0 && x < radii.bottomLeft && y >= h - radii.bottomLeft) {
    return sampleCorner(
      x,
      y,
      radii.bottomLeft,
      h - radii.bottomLeft,
      radii.bottomLeft,
      bezel,
      aa,
      "bottomLeft"
    );
  }

  const candidates: Array<{ distance: number; normalX: number; normalY: number }> = [];
  if (x >= radii.topLeft && x <= w - radii.topRight && y <= bezel + aa) {
    candidates.push({ distance: y, normalX: 0, normalY: -1 });
  }
  if (y >= radii.topRight && y <= h - radii.bottomRight && w - x <= bezel + aa) {
    candidates.push({ distance: w - x, normalX: 1, normalY: 0 });
  }
  if (x >= radii.bottomLeft && x <= w - radii.bottomRight && h - y <= bezel + aa) {
    candidates.push({ distance: h - y, normalX: 0, normalY: 1 });
  }
  if (y >= radii.topLeft && y <= h - radii.bottomLeft && x <= bezel + aa) {
    candidates.push({ distance: x, normalX: -1, normalY: 0 });
  }

  const validCandidates = candidates.filter(
    (candidate) => candidate.distance >= -aa && candidate.distance <= bezel
  );
  if (validCandidates.length === 0) return null;

  const minDistance = Math.min(...validCandidates.map((candidate) => candidate.distance));
  const tied = validCandidates.filter(
    (candidate) => Math.abs(candidate.distance - minDistance) < 0.5
  );
  const normal = tied.reduce(
    (acc, candidate) => {
      acc.x += candidate.normalX;
      acc.y += candidate.normalY;
      return acc;
    },
    { x: 0, y: 0 }
  );
  const [normalX, normalY] = normalizeVector(normal.x, normal.y);

  return {
    distanceFromSide: minDistance,
    normalX,
    normalY,
    opacity: 1,
  };
}

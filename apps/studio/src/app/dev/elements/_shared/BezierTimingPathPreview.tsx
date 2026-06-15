import type {
  PbImageAnimationCurve,
  PbImageAnimationCurvePreset,
} from "@/app/theme/pb-builder-defaults";

const PRESET_TUPLES: Record<
  Exclude<PbImageAnimationCurvePreset, "customBezier">,
  [number, number, number, number]
> = {
  linear: [0, 0, 1, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
};

function bezierTupleFromCurve(curve: PbImageAnimationCurve): [number, number, number, number] {
  if (curve.preset === "customBezier") {
    const [a, b, c, d] = curve.customBezier;
    return [
      Number.isFinite(a) ? a : 0,
      Number.isFinite(b) ? b : 0,
      Number.isFinite(c) ? c : 1,
      Number.isFinite(d) ? d : 1,
    ];
  }
  return PRESET_TUPLES[curve.preset];
}

/**
 * Visualizes `cubic-bezier(x1,y1,x2,y2)` as a timing curve (time → eased progress),
 * matching CSS / Framer: (0,0) → (1,1) with control points (x1,y1) and (x2,y2).
 */
export function BezierTimingPathPreview({
  curve,
  className = "",
}: {
  curve: PbImageAnimationCurve;
  className?: string;
}) {
  const [x1, y1, x2, y2] = bezierTupleFromCurve(curve);
  const W = 100;
  const H = 56;
  const pad = 6;
  const innerW = W - pad * 2;
  const innerH = H - pad * 2;

  const px = (x: number) => pad + x * innerW;
  const py = (y: number) => pad + (1 - y) * innerH;

  const x0 = px(0);
  const y0 = py(0);
  const x3 = px(1);
  const y3 = py(1);
  const cx1 = px(x1);
  const cy1 = py(y1);
  const cx2 = px(x2);
  const cy2 = py(y2);

  const pathD = `M ${x0} ${y0} C ${cx1} ${cy1} ${cx2} ${cy2} ${x3} ${y3}`;

  return (
    <div className={`space-y-1 ${className}`}>
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        Timing path
      </span>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded border border-border/60 bg-muted/20 text-muted-foreground"
        role="img"
        aria-label="Easing curve from start to end progress"
      >
        <line
          x1={x0}
          y1={y0}
          x2={x3}
          y2={y3}
          stroke="currentColor"
          strokeWidth={0.5}
          strokeDasharray="2 3"
          opacity={0.35}
        />
        <line
          x1={x0}
          y1={y0}
          x2={cx1}
          y2={cy1}
          stroke="currentColor"
          strokeWidth={0.6}
          opacity={0.4}
        />
        <line
          x1={x3}
          y1={y3}
          x2={cx2}
          y2={cy2}
          stroke="currentColor"
          strokeWidth={0.6}
          opacity={0.4}
        />
        <g className="text-foreground">
          <path d={pathD} fill="none" stroke="currentColor" strokeWidth={1.25} />
        </g>
        <circle cx={cx1} cy={cy1} r={1.8} fill="currentColor" opacity={0.85} />
        <circle cx={cx2} cy={cy2} r={1.8} fill="currentColor" opacity={0.85} />
        <circle cx={x0} cy={y0} r={1.5} fill="currentColor" opacity={0.5} />
        <circle cx={x3} cy={y3} r={1.5} fill="currentColor" opacity={0.5} />
      </svg>
    </div>
  );
}

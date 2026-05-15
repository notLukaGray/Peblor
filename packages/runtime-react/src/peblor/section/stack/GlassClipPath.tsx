"use client";

import { useEffect, type RefObject } from "react";

type Props = {
  /** Unique ID for the <clipPath> element — referenced as clip-path: url(#id). */
  id: string;
  /** Normalized SVG path data in objectBoundingBox [0,1]×[0,1] coordinates. */
  clipPath: string;
  /** SVG fill/clip rule. Default: nonzero. */
  clipRule?: "nonzero" | "evenodd";
  /**
   * The parent element to also clip (the <figure> wrapper).
   * Applied imperatively so the content and the glass overlay share the same shape.
   */
  parentRef: RefObject<HTMLElement | null>;
};

/**
 * Renders a hidden SVG <clipPath> definition using objectBoundingBox coordinates
 * and imperatively clips the parent element to the same shape.
 *
 * objectBoundingBox coordinates (0–1 range) scale automatically to any rendered
 * element size — no JavaScript rescaling needed.
 *
 * Usage in SectionGlassEffect:
 *   <GlassClipPath id={clipPathId} clipPath={glass.clipPath} parentRef={sectionRef} />
 *   // Then apply clip-path: url(#clipPathId) to the backdrop overlay div.
 */
export function GlassClipPath({ id, clipPath, clipRule = "nonzero", parentRef }: Props) {
  // Apply clip-path to the parent <figure> so its content is also clipped to the shape.
  // Restores the previous value on unmount.
  useEffect(() => {
    const el = parentRef?.current;
    if (!el) return;
    const prev = el.style.getPropertyValue("clip-path");
    const prevWebkit = el.style.getPropertyValue("-webkit-clip-path");
    el.style.setProperty("clip-path", `url(#${id})`);
    el.style.setProperty("-webkit-clip-path", `url(#${id})`);
    return () => {
      if (prev) {
        el.style.setProperty("clip-path", prev);
      } else {
        el.style.removeProperty("clip-path");
      }
      if (prevWebkit) {
        el.style.setProperty("-webkit-clip-path", prevWebkit);
      } else {
        el.style.removeProperty("-webkit-clip-path");
      }
    };
  }, [id, parentRef]);

  return (
    <svg
      aria-hidden
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <defs>
        <clipPath id={id} clipPathUnits="objectBoundingBox">
          <path d={clipPath} clipRule={clipRule} fillRule={clipRule} />
        </clipPath>
      </defs>
    </svg>
  );
}

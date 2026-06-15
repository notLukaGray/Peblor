"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera as ThreePerspectiveCamera, Vector3 } from "three";
import { useSectionScrollTarget } from "@/peblor/section/position/SectionScrollTargetContext";
import {
  useScrollContainerRef,
  useScrollContainerScrollTopRef,
} from "@/peblor/section/position/use-scroll-container";
import type { SceneDef } from "@pb/contracts/peblor/core/peblor-schemas";
import {
  computeSectionScrollProgress,
  measureSectionScrollProgressMetrics,
  type SectionScrollProgressMetrics,
} from "./model3d-scroll-progress";

type Keyframe = NonNullable<SceneDef["scrollCamera"]>["keyframes"][number];

type SampledFrame = {
  position: [number, number, number];
  lookAt: [number, number, number];
  fov?: number;
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpTuple(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function toSample(frame: Keyframe): SampledFrame {
  return {
    position: frame.position,
    lookAt: frame.lookAt ?? [0, 0, 0],
    fov: frame.fov,
  };
}

function sampleKeyframes(keyframes: Keyframe[], progress: number): SampledFrame {
  const sorted = [...keyframes].sort((a, b) => a.at - b.at);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) {
    return { position: [0, 0, 5], lookAt: [0, 0, 0] };
  }
  if (progress <= first.at) return toSample(first);
  if (progress >= last.at) return toSample(last);

  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i];
    const to = sorted[i + 1];
    if (!from || !to) continue;
    if (progress >= from.at && progress <= to.at) {
      const span = to.at - from.at;
      const t = span <= 0 ? 0 : (progress - from.at) / span;
      return {
        position: lerpTuple(from.position, to.position, t),
        lookAt: lerpTuple(from.lookAt ?? [0, 0, 0], to.lookAt ?? [0, 0, 0], t),
        fov: from.fov != null && to.fov != null ? lerp(from.fov, to.fov, t) : (to.fov ?? from.fov),
      };
    }
  }
  return toSample(last);
}

function mapScrollOffsets(progress: number, startOffset = 0, endOffset = 0): number {
  if (startOffset === 0 && endOffset === 0) return progress;
  const start = startOffset;
  const end = 1 - endOffset;
  if (end <= start) return progress;
  return Math.max(0, Math.min(1, (progress - start) / (end - start)));
}

function resolveScrollSectionElement(
  canvas: HTMLElement,
  contextRef: RefObject<HTMLElement | null> | null
): HTMLElement | null {
  if (contextRef?.current) return contextRef.current;
  let node: HTMLElement | null = canvas.parentElement;
  let outerSection: HTMLElement | null = null;
  while (node) {
    if (node.dataset.sectionType === "contentBlock") outerSection = node;
    node = node.parentElement;
  }
  return outerSection;
}

function applyScrollSample(
  camera: ThreePerspectiveCamera,
  lookAtVec: Vector3,
  scrollCamera: NonNullable<SceneDef["scrollCamera"]>,
  progress: number
): void {
  const sample = sampleKeyframes(scrollCamera.keyframes, progress);
  camera.position.set(sample.position[0], sample.position[1], sample.position[2]);
  lookAtVec.set(sample.lookAt[0], sample.lookAt[1], sample.lookAt[2]);
  camera.lookAt(lookAtVec);
  if (sample.fov != null) {
    camera.fov = sample.fov;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
}

export function SceneScrollCamera({
  scrollCamera,
}: {
  scrollCamera: NonNullable<SceneDef["scrollCamera"]>;
}) {
  const { camera, gl, invalidate } = useThree();
  const contextSectionRef = useSectionScrollTarget();
  const containerRef = useScrollContainerRef();
  const scrollTopRef = useScrollContainerScrollTopRef();
  const sectionElRef = useRef<HTMLElement | null>(null);
  const sectionMetricsRef = useRef<SectionScrollProgressMetrics | null>(null);
  const lookAtVec = useRef(new Vector3());

  useLayoutEffect(() => {
    const sectionEl = resolveScrollSectionElement(gl.domElement, contextSectionRef);
    sectionElRef.current = sectionEl;
    if (!sectionEl) {
      sectionMetricsRef.current = null;
      return;
    }

    function measureSection() {
      const currentSectionEl = sectionElRef.current;
      if (!currentSectionEl) {
        sectionMetricsRef.current = null;
        return;
      }

      sectionMetricsRef.current = measureSectionScrollProgressMetrics(
        currentSectionEl,
        containerRef?.current ?? null
      );
    }

    function onScroll() {
      measureSection();
      invalidate();
    }

    measureSection();

    // Re-measure on scroll. Without a ScrollContainerProvider, the scrollTopRef
    // isn't available and window.scrollY stays 0 for container-scrolled pages
    // (e.g. pages with a .work-scroll layout but no page-level `scroll` config).
    // Re-measuring getBoundingClientRect on scroll keeps the cached metrics in
    // sync with the actual viewport position regardless of which element scrolls.
    const scrollTarget = containerRef?.current ?? window;
    scrollTarget.addEventListener("scroll", onScroll, { passive: true });

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            measureSection();
            invalidate();
          })
        : null;
    if (resizeObserver) {
      resizeObserver.observe(sectionEl);
      if (containerRef?.current) {
        resizeObserver.observe(containerRef.current);
      }
    }

    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      resizeObserver?.disconnect();
      scrollTarget.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [containerRef, contextSectionRef, gl.domElement, invalidate]);

  useFrame(() => {
    if (!(camera instanceof ThreePerspectiveCamera)) return;
    const sectionMetrics = sectionMetricsRef.current;
    if (!sectionMetrics) return;

    const raw = computeSectionScrollProgress(
      sectionMetrics,
      scrollTopRef?.current ?? (typeof window !== "undefined" ? window.scrollY : 0)
    );
    const progress = mapScrollOffsets(raw, scrollCamera.startOffset, scrollCamera.endOffset);
    applyScrollSample(camera, lookAtVec.current, scrollCamera, progress);
  }, 2);

  return null;
}

"use client";

import { useEffect, useRef } from "react";
import { firePeblorAction } from "@/peblor/triggers";
import type { MediaProgressTriggerDef } from "@pb/contracts/peblor/core/peblor-schemas/section-block-base-schemas";

export type { MediaProgressTriggerDef };

export function useMediaProgressTrigger(defs: MediaProgressTriggerDef[]): void {
  const firedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!defs || defs.length === 0) return;
    firedRef.current.clear();

    const attached: Array<{ el: HTMLMediaElement; handler: () => void }> = [];

    for (let i = 0; i < defs.length; i++) {
      const def = defs[i]!;
      const el = document.getElementById(def.id) as HTMLMediaElement | null;
      if (!el || !("duration" in el)) continue;

      const idx = i;
      const handler = () => {
        if (el.duration <= 0) return;
        const progress = el.currentTime / el.duration;
        if (progress >= def.at) {
          if (firedRef.current.has(idx)) return;
          firedRef.current.add(idx);
          firePeblorAction(def.onReach, "trigger");
        } else if (!def.once) {
          firedRef.current.delete(idx);
        }
      };

      el.addEventListener("timeupdate", handler);
      attached.push({ el, handler });
    }

    return () => {
      for (const { el, handler } of attached) el.removeEventListener("timeupdate", handler);
    };
  }, [defs]);
}

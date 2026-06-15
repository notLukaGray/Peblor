"use client";

import { useEffect } from "react";
import type { PeblorAction } from "@pb/contracts/types";
import { firePeblorAction } from "./trigger-event";

export type MediaEndTriggerDef = {
  id: string;
  onEnd: PeblorAction;
};

export function useMediaEndTrigger(defs: MediaEndTriggerDef[]): void {
  useEffect(() => {
    if (!defs || defs.length === 0) return;

    const attached: Array<{ el: HTMLMediaElement; handler: () => void }> = [];

    for (const def of defs) {
      const el = document.getElementById(def.id) as HTMLMediaElement | null;
      if (!el || !("ended" in el)) continue;
      const handler = () => firePeblorAction(def.onEnd, "trigger");
      el.addEventListener("ended", handler);
      attached.push({ el, handler });
    }

    return () => {
      for (const { el, handler } of attached) {
        el.removeEventListener("ended", handler);
      }
    };
  }, [defs]);
}

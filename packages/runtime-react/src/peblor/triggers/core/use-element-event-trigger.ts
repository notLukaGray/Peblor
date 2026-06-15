"use client";

import { useEffect } from "react";
import { firePeblorAction } from "@/peblor/triggers";
import type { PeblorAction } from "@pb/contracts/types";
import type { ElementEventTriggerDef } from "@pb/contracts/peblor/core/peblor-schemas/section-block-base-schemas";

export type { ElementEventTriggerDef };

export function useElementEventTrigger(defs: ElementEventTriggerDef[]): void {
  useEffect(() => {
    if (!defs || defs.length === 0) return;

    const attached: Array<{ el: Element; type: string; handler: EventListener }> = [];

    for (const def of defs) {
      const el = document.getElementById(def.id);
      if (!el) continue;

      const attach = (type: string, action: PeblorAction | undefined) => {
        if (!action) return;
        const handler: EventListener = () => firePeblorAction(action, "trigger");
        el.addEventListener(type, handler);
        attached.push({ el, type, handler });
      };

      attach("click", def.onClick);
      attach("mouseenter", def.onHoverEnter);
      attach("mouseleave", def.onHoverLeave);
      attach("focus", def.onFocus);
      attach("blur", def.onBlur);
      attach("change", def.onChange);
    }

    return () => {
      for (const { el, type, handler } of attached) el.removeEventListener(type, handler);
    };
  }, [defs]);
}

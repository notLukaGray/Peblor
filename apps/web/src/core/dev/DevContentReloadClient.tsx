"use client";

import { useEffect, useRef } from "react";

const POLL_INTERVAL_MS = 1200;

export function DevContentReloadClient() {
  const lastSeen = useRef<number>(0);
  const hasBaseline = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (typeof window === "undefined") return;

    const controller = new AbortController();

    const poll = async () => {
      try {
        const res = await fetch("/api/dev/content-watch", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const data: { lastContentChange: number } = await res.json();
        const t = typeof data.lastContentChange === "number" ? data.lastContentChange : 0;
        if (hasBaseline.current && t > lastSeen.current) {
          window.location.reload();
        }
        lastSeen.current = t;
        hasBaseline.current = true;
      } catch (e) {
        if ((e as { name?: string }).name === "AbortError") return;
      }
    };

    void poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, []);

  return null;
}

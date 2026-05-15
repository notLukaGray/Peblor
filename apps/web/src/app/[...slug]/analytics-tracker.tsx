"use client";

import { useEffect } from "react";
import { pageView, initAnalytics } from "@/core/lib/analytics";

let initialized = false;

export function PageViewTracker({ path, title }: { path: string; title?: string }) {
  useEffect(() => {
    if (!initialized) {
      initAnalytics();
      initialized = true;
    }
    pageView(path, { title });
  }, [path, title]);

  return null;
}

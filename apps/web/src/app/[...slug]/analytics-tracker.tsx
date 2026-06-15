"use client";

import { useEffect, useRef } from "react";
import { pageView, initAnalytics } from "@/core/lib/analytics";

export function PageViewTracker({ path, title }: { path: string; title?: string }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initAnalytics();
      initialized.current = true;
    }
    pageView(path, { title });
  }, [path, title]);

  return null;
}

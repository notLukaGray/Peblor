"use client";

import { useEffect, useRef } from "react";
import { useBrowserData } from "@pb/runtime-react/core/hooks/use-browser-data";
import { serializeBrowserDataCookie } from "@/core/lib/browser-data-cookie";

export function BrowserDataClient() {
  const browserData = useBrowserData();
  const lastCookieValueRef = useRef<string>("");

  useEffect(() => {
    if (!browserData) return;
    const cookie = serializeBrowserDataCookie({
      viewportWidthPx: browserData.viewportWidthPx,
      viewportHeightPx: browserData.viewportHeightPx,
      devicePixelRatio: browserData.devicePixelRatio,
      updatedAtMs: Date.now(),
    });
    if (cookie === lastCookieValueRef.current) return;
    document.cookie = cookie;
    lastCookieValueRef.current = cookie;
  }, [browserData]);

  return null;
}

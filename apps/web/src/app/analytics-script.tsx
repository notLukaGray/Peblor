"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export function AnalyticsScript() {
  if (process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER !== "vercel") return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}

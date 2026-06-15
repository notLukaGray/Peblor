"use client";

import dynamic from "next/dynamic";

// Dynamic imports so these packages only land in a separate deferred chunk.
// When NEXT_PUBLIC_ANALYTICS_PROVIDER !== "vercel" the component returns null
// and the chunks are never requested — zero client bundle cost.
const VercelAnalytics = dynamic(() => import("@vercel/analytics/next").then((m) => m.Analytics), {
  ssr: false,
});
const VercelSpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((m) => m.SpeedInsights),
  { ssr: false }
);

export function AnalyticsScript() {
  if (process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER !== "vercel") return null;
  return (
    <>
      <VercelAnalytics />
      <VercelSpeedInsights />
    </>
  );
}

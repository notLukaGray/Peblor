"use client";

import dynamic from "next/dynamic";

const ColorToolClientInner = dynamic(
  () =>
    import("@/devtools/app-dev/colors/ColorToolClient").then((m) => ({
      default: m.ColorToolClient,
    })),
  { ssr: false }
);

export function ColorToolClient() {
  return <ColorToolClientInner />;
}

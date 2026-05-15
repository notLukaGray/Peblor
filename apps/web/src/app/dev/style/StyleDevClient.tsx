"use client";

import dynamic from "next/dynamic";
import type { StyleDevScope } from "@/devtools/app-dev/style/style-dev-config";

const StyleDevClientInner = dynamic(
  () =>
    import("@/devtools/app-dev/style/StyleDevClient").then((m) => ({
      default: m.StyleDevClient,
    })),
  { ssr: false }
);

export function StyleDevClient({ scope = "foundations" }: { scope?: StyleDevScope }) {
  return <StyleDevClientInner scope={scope} />;
}

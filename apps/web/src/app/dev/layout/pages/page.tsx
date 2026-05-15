import type { Metadata } from "next";
import { LayoutPagesDevClient } from "./LayoutPagesDevClient";

export const metadata: Metadata = {
  title: "Layout · Pages (dev)",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function LayoutPagesDevPage() {
  return <LayoutPagesDevClient />;
}

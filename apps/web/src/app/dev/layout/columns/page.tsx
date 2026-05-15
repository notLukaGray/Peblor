import type { Metadata } from "next";
import { LayoutColumnsDevClient } from "./LayoutColumnsDevClient";

export const metadata: Metadata = {
  title: "Layout · Columns (dev)",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function LayoutColumnsDevPage() {
  return <LayoutColumnsDevClient />;
}

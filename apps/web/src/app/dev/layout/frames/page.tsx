import type { Metadata } from "next";
import { LayoutFramesDevClient } from "./LayoutFramesDevClient";

export const metadata: Metadata = {
  title: "Layout · Frames (dev)",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function LayoutFramesDevPage() {
  return <LayoutFramesDevClient />;
}

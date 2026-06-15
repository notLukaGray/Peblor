import type { Metadata } from "next";
import { DevTestClient } from "./DevTestClient";

export const metadata: Metadata = {
  title: "Defaults Test Page (dev)",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function DevTestPage() {
  return <DevTestClient />;
}

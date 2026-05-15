import type { Metadata } from "next";
import { CustomModeDevClient } from "./CustomModeDevClient";

export const metadata: Metadata = {
  title: "Custom JSON (dev)",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function CustomModeDevPage() {
  return <CustomModeDevClient />;
}

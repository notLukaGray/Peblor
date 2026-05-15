import type { Metadata } from "next";
import { ColorToolClient } from "./index";

export const metadata: Metadata = {
  title: "Colors (dev)",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function ColorDevPage() {
  return <ColorToolClient />;
}

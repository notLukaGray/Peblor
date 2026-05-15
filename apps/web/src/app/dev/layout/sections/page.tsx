import type { Metadata } from "next";
import { LayoutSectionsDevClient } from "./LayoutSectionsDevClient";

export const metadata: Metadata = {
  title: "Layout · Sections (dev)",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function LayoutSectionsDevPage() {
  return <LayoutSectionsDevClient />;
}

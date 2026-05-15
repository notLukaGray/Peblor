import type { Metadata } from "next";
import { StyleDevClient } from "./index";

export const metadata: Metadata = {
  title: "Spacing / Style (dev)",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function StyleDevPage() {
  return <StyleDevClient scope="foundations" />;
}

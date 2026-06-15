import type { Metadata } from "next";
import { HlsToolsClient } from "./HlsToolsClient";

export const metadata: Metadata = {
  title: "HLS Converter (dev)",
};

export default function DevHlsToolsPage() {
  return <HlsToolsClient />;
}

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { PeblorDevOverlay } from "@/peblor/dev/PeblorDevOverlay";
import { useFigmaExportDiagnosticsStore } from "@/peblor/dev/figma-export-diagnostics-store";

export function PeblorDevRouteClient() {
  const pathname = usePathname();

  useEffect(() => {
    useFigmaExportDiagnosticsStore.getState().clear();
  }, [pathname]);

  return <PeblorDevOverlay />;
}

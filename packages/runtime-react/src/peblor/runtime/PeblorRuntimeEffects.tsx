"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { clearVariables } from "@/peblor/runtime/peblor-variable-store";
import { usePeblorActionRunner } from "@/peblor/hooks/use-peblor-action-runner";

export function PeblorRuntimeEffects() {
  usePeblorActionRunner();
  const pathname = usePathname();

  useEffect(() => {
    clearVariables();
  }, [pathname]);

  return null;
}

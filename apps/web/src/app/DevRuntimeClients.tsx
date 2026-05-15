"use client";

import { DevPageValidationClient } from "@/core/dev/DevPageValidationClient";
import { DevContentReloadClient } from "@/core/dev/DevContentReloadClient";
import { PbFoundationsRuntimeSync } from "@/app/theme/PbFoundationsRuntimeSync";
import { PbColorsRuntimeSync } from "@/app/theme/PbColorsRuntimeSync";

export function DevRuntimeClients() {
  return (
    <>
      <DevPageValidationClient />
      <DevContentReloadClient />
      <PbFoundationsRuntimeSync />
      <PbColorsRuntimeSync />
    </>
  );
}

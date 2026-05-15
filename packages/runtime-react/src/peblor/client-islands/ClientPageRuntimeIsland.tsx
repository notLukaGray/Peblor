"use client";

import { useEffect, type ReactNode } from "react";
import type { PageScrollConfig } from "@pb/contracts/types";
import { PeblorRuntimeEffects } from "@pb/runtime-react/effects";
import { ServerBreakpointProvider } from "../../core/providers/device-type-provider";
import { PageScrollProvider } from "../section/position/page-scroll-provider";
import {
  type ForcedTheme,
  applyForcedTheme,
  resolvePreferredTheme,
} from "../theme/forced-theme-utils";

export function ClientPageRuntimeIsland({
  children,
  forcedTheme,
  serverIsMobile,
  scroll,
}: {
  children: ReactNode;
  forcedTheme?: ForcedTheme;
  serverIsMobile?: boolean;
  scroll?: PageScrollConfig;
}) {
  useEffect(() => {
    if (forcedTheme !== "light" && forcedTheme !== "dark") return;

    const root = document.documentElement;
    root.dataset.pbForcedTheme = forcedTheme;
    applyForcedTheme(forcedTheme);

    return () => {
      delete root.dataset.pbForcedTheme;
      applyForcedTheme(resolvePreferredTheme());
    };
  }, [forcedTheme]);

  const content =
    serverIsMobile !== undefined ? (
      <ServerBreakpointProvider isMobile={serverIsMobile}>{children}</ServerBreakpointProvider>
    ) : (
      children
    );

  return (
    <>
      <PeblorRuntimeEffects />
      {scroll != null ? (
        <PageScrollProvider scroll={scroll}>{content}</PageScrollProvider>
      ) : (
        content
      )}
    </>
  );
}

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
  needsRuntimeEffects = true,
  needsBreakpointProvider = true,
}: {
  children: ReactNode;
  forcedTheme?: ForcedTheme;
  serverIsMobile?: boolean;
  scroll?: PageScrollConfig;
  /** Only mount PeblorRuntimeEffects when the page has triggers/actions. Default true for back-compat. */
  needsRuntimeEffects?: boolean;
  /** Only wrap ServerBreakpointProvider when client/mixed blocks need useDeviceType(). Default true for back-compat. */
  needsBreakpointProvider?: boolean;
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
    needsBreakpointProvider && serverIsMobile !== undefined ? (
      <ServerBreakpointProvider isMobile={serverIsMobile}>{children}</ServerBreakpointProvider>
    ) : (
      children
    );

  if (scroll != null) {
    return (
      <PageScrollProvider scroll={scroll}>
        {needsRuntimeEffects && <PeblorRuntimeEffects />}
        {content}
      </PageScrollProvider>
    );
  }

  return (
    <>
      {needsRuntimeEffects && <PeblorRuntimeEffects />}
      {content}
    </>
  );
}

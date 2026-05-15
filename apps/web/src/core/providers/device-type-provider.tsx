"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { subscribeWorkbenchSessionChanges } from "@/core/lib/workbench-session-subscribe";

interface DeviceTypeContextValue {
  isDesktop: boolean;
  isMobile: boolean;
}

const DeviceTypeContext = createContext<DeviceTypeContextValue | undefined>(undefined);

/** When set (e.g. by PeblorRenderer with server-resolved tree), useDeviceType returns this and no resize listener runs. */
const ServerBreakpointContext = createContext<DeviceTypeContextValue | undefined>(undefined);

const DEFAULT_MOBILE_BREAKPOINT = 768;

function readDesktopBreakpointFromCssVars(): number {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return DEFAULT_MOBILE_BREAKPOINT;
  }
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--pb-breakpoint-desktop")
    .trim();
  if (!raw) return DEFAULT_MOBILE_BREAKPOINT;
  const numeric = raw.endsWith("px") ? Number(raw.slice(0, -2)) : Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) return DEFAULT_MOBILE_BREAKPOINT;
  return numeric;
}

export function useDeviceType(): DeviceTypeContextValue {
  const serverBreakpoint = useContext(ServerBreakpointContext);
  const context = useContext(DeviceTypeContext);
  if (serverBreakpoint !== undefined) return serverBreakpoint;
  if (context === undefined) {
    throw new Error(
      "useDeviceType must be used within DeviceTypeProvider or ServerBreakpointProvider"
    );
  }
  return context;
}

/** Use when the tree was pre-resolved on the server (e.g. getPeblorPropsAsync with isMobile). No resize listener; first paint uses server breakpoint. */
export function ServerBreakpointProvider({
  isMobile,
  children,
}: {
  isMobile: boolean;
  children: React.ReactNode;
}) {
  const value: DeviceTypeContextValue = {
    isMobile,
    isDesktop: !isMobile,
  };
  return (
    <ServerBreakpointContext.Provider value={value}>{children}</ServerBreakpointContext.Provider>
  );
}

export function DeviceTypeProvider({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkDeviceType = () => {
      const isMobileUserAgent = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const desktopBreakpoint = readDesktopBreakpointFromCssVars();
      const isMobileWidth = window.innerWidth < desktopBreakpoint;
      const isMobile = isMobileUserAgent || isMobileWidth;
      setIsDesktop(!isMobile);
    };

    checkDeviceType();
    window.addEventListener("resize", checkDeviceType);
    const unsubscribeWorkbenchSession = subscribeWorkbenchSessionChanges(checkDeviceType);

    return () => {
      window.removeEventListener("resize", checkDeviceType);
      unsubscribeWorkbenchSession();
    };
  }, []);

  const value: DeviceTypeContextValue = {
    isDesktop,
    isMobile: !isDesktop,
  };

  return <DeviceTypeContext.Provider value={value}>{children}</DeviceTypeContext.Provider>;
}

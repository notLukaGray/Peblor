"use client";

import React, { createContext, useContext, useMemo, useSyncExternalStore } from "react";

interface DeviceTypeContextValue {
  isDesktop: boolean;
  isMobile: boolean;
}

/** When set (e.g. by PeblorRenderer with server-resolved tree), useDeviceType returns this and no resize listener runs. */
const ServerBreakpointContext = createContext<DeviceTypeContextValue | undefined>(undefined);

const DEFAULT_MOBILE_BREAKPOINT = 768;
const WORKBENCH_SESSION_CHANGED_EVENT = "pb-workbench-session-changed";
const MOBILE_USER_AGENT_REGEX = /iPhone|iPad|iPod|Android/i;
const EMPTY_DEVICE_TYPE_SUBSCRIBE = () => () => {};

const deviceTypeListeners = new Set<() => void>();
let deviceTypeSnapshot: DeviceTypeContextValue = { isDesktop: true, isMobile: false };
let deviceTypeWindowListener: (() => void) | null = null;

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

function readDeviceTypeSnapshot(): DeviceTypeContextValue {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { isDesktop: true, isMobile: false };
  }
  const isMobileUserAgent = MOBILE_USER_AGENT_REGEX.test(navigator.userAgent);
  const desktopBreakpoint = readDesktopBreakpointFromCssVars();
  const isMobileWidth = window.innerWidth < desktopBreakpoint;
  const isMobile = isMobileUserAgent || isMobileWidth;
  return { isDesktop: !isMobile, isMobile };
}

function getDeviceTypeSnapshot(): DeviceTypeContextValue {
  return deviceTypeSnapshot;
}

const DESKTOP_DEVICE_TYPE: DeviceTypeContextValue = { isDesktop: true, isMobile: false };

function getDeviceTypeServerSnapshot(): DeviceTypeContextValue {
  return DESKTOP_DEVICE_TYPE;
}

function refreshDeviceTypeSnapshot(): void {
  const next = readDeviceTypeSnapshot();
  if (
    next.isDesktop === deviceTypeSnapshot.isDesktop &&
    next.isMobile === deviceTypeSnapshot.isMobile
  ) {
    return;
  }
  deviceTypeSnapshot = next;
  for (const listener of deviceTypeListeners) listener();
}

function subscribeDeviceType(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  deviceTypeListeners.add(callback);

  if (deviceTypeWindowListener == null) {
    const onChange = () => refreshDeviceTypeSnapshot();
    deviceTypeWindowListener = onChange;
    deviceTypeSnapshot = readDeviceTypeSnapshot();
    window.addEventListener("resize", onChange);
    window.addEventListener("storage", onChange);
    window.addEventListener(WORKBENCH_SESSION_CHANGED_EVENT, onChange);
  }

  refreshDeviceTypeSnapshot();

  return () => {
    deviceTypeListeners.delete(callback);
    if (deviceTypeListeners.size > 0 || deviceTypeWindowListener == null) return;
    window.removeEventListener("resize", deviceTypeWindowListener);
    window.removeEventListener("storage", deviceTypeWindowListener);
    window.removeEventListener(WORKBENCH_SESSION_CHANGED_EVENT, deviceTypeWindowListener);
    deviceTypeWindowListener = null;
  };
}

export function useDeviceType(): DeviceTypeContextValue {
  const serverBreakpoint = useContext(ServerBreakpointContext);
  const subscribe = serverBreakpoint ? EMPTY_DEVICE_TYPE_SUBSCRIBE : subscribeDeviceType;
  const getSnapshot = serverBreakpoint ? () => serverBreakpoint : getDeviceTypeSnapshot;
  const getServerSnapshot = serverBreakpoint ? () => serverBreakpoint : getDeviceTypeServerSnapshot;
  const runtimeDeviceType = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return runtimeDeviceType;
}

/** Use when the tree was pre-resolved on the server (e.g. getPeblorPropsAsync with isMobile). No resize listener; first paint uses server breakpoint. */
export function ServerBreakpointProvider({
  isMobile,
  children,
}: {
  isMobile: boolean;
  children: React.ReactNode;
}) {
  const serverSnapshot = useMemo(() => ({ isDesktop: !isMobile, isMobile }), [isMobile]);
  const value = useSyncExternalStore(
    subscribeDeviceType,
    getDeviceTypeSnapshot,
    () => serverSnapshot
  );
  return (
    <ServerBreakpointContext.Provider value={value}>{children}</ServerBreakpointContext.Provider>
  );
}

export function DeviceTypeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

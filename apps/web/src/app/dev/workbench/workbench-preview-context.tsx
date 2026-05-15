"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { typeScaleToWorkbenchTypographyStyleVars } from "@/app/fonts/css-vars";
import { getPbFoundationCssVarMaps } from "@/app/theme/pb-foundation-css";
import { expandGuidelinesToCssVars } from "@/app/theme/pb-guidelines-expand";
import { useDevPreviewFontVars } from "@/app/dev/elements/_shared/useDevPreviewFontVars";
import {
  getDefaultWorkbenchSession,
  type WorkbenchSessionV2,
} from "@/app/dev/workbench/workbench-defaults";
import type { PreviewViewportPreset } from "@/app/dev/workbench/preview-fidelity";
import {
  getWorkbenchSession,
  WORKBENCH_SESSION_CHANGED_EVENT,
  WORKBENCH_SESSION_STORAGE_KEY,
} from "@/app/dev/workbench/workbench-session";
import { ServerBreakpointProvider } from "@pb/runtime-react/core/providers/device-type-provider";

export type WorkbenchPreviewBreakpoint = PreviewViewportPreset;

export const WORKBENCH_PREVIEW_VIEWPORTS: Record<
  WorkbenchPreviewBreakpoint,
  { label: string; canvasWidthPx: number }
> = {
  desktop: { label: "desktop", canvasWidthPx: 1120 },
  tablet: { label: "tablet", canvasWidthPx: 840 },
  mobile: { label: "mobile", canvasWidthPx: 390 },
};

type WorkbenchPreviewDefaults = {
  style: WorkbenchSessionV2["style"];
  fonts: WorkbenchSessionV2["fonts"];
  colors: WorkbenchSessionV2["colors"];
};

type WorkbenchPreviewContextValue = {
  breakpoint: WorkbenchPreviewBreakpoint;
  isMobile: boolean;
  viewport: (typeof WORKBENCH_PREVIEW_VIEWPORTS)[WorkbenchPreviewBreakpoint];
  defaults: WorkbenchPreviewDefaults;
};

const WorkbenchPreviewContext = createContext<WorkbenchPreviewContextValue | undefined>(undefined);

const DEFAULT_BREAKPOINT: WorkbenchPreviewBreakpoint = "desktop";

let cachedSessionKey = "";
let cachedDefaults: WorkbenchPreviewDefaults | null = null;
let cachedServerDefaults: WorkbenchPreviewDefaults | null = null;

function readServerSnapshot(): WorkbenchPreviewDefaults {
  if (cachedServerDefaults) return cachedServerDefaults;
  const session = getDefaultWorkbenchSession();
  cachedServerDefaults = { style: session.style, fonts: session.fonts, colors: session.colors };
  return cachedServerDefaults;
}

function readSessionSnapshot(): WorkbenchPreviewDefaults {
  const session = getWorkbenchSession();
  const key = JSON.stringify({
    style: session.style,
    fonts: session.fonts,
    colors: session.colors,
  });
  if (cachedDefaults && cachedSessionKey === key) return cachedDefaults;
  cachedSessionKey = key;
  cachedDefaults = { style: session.style, fonts: session.fonts, colors: session.colors };
  return cachedDefaults;
}

function subscribeToWorkbenchPreview(callback: () => void): () => void {
  window.addEventListener(WORKBENCH_SESSION_CHANGED_EVENT, callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === WORKBENCH_SESSION_STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(WORKBENCH_SESSION_CHANGED_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

function useWorkbenchPreviewDefaults(): WorkbenchPreviewDefaults {
  return useSyncExternalStore(subscribeToWorkbenchPreview, readSessionSnapshot, readServerSnapshot);
}

type WorkbenchPreviewProviderProps = {
  children: React.ReactNode;
  breakpoint?: WorkbenchPreviewBreakpoint;
  className?: string;
  style?: CSSProperties;
};

export function WorkbenchPreviewProvider({
  children,
  breakpoint = DEFAULT_BREAKPOINT,
  className,
  style,
}: WorkbenchPreviewProviderProps) {
  const defaults = useWorkbenchPreviewDefaults();
  const fontVars = useDevPreviewFontVars();
  const foundationVars = useMemo(() => {
    const maps = getPbFoundationCssVarMaps(defaults);
    return maps.root;
  }, [defaults]);
  const guidelineVars = useMemo(
    () => expandGuidelinesToCssVars(defaults.style.guidelines),
    [defaults.style.guidelines]
  );
  const typographyVars = useMemo(
    () =>
      typeScaleToWorkbenchTypographyStyleVars({
        typeScale: defaults.fonts.typeScale,
        primaryWeights: defaults.fonts.configs.primary.weights,
        useMobileSizes: breakpoint === "mobile",
      }),
    [breakpoint, defaults.fonts.configs.primary.weights, defaults.fonts.typeScale]
  );
  const previewVars = useMemo<CSSProperties>(
    () => ({
      ...typographyVars,
      ...foundationVars,
      ...guidelineVars,
      ...fontVars,
      // Fonts + scales + spacing on this root. Layout previews inherit the same `/dev` theme as
      // surrounding chrome unless a surface opts into `WorkbenchElementPreviewSurface`.
      ...style,
    }),
    [fontVars, foundationVars, guidelineVars, style, typographyVars]
  );

  const value = useMemo<WorkbenchPreviewContextValue>(
    () => ({
      breakpoint,
      isMobile: breakpoint === "mobile",
      viewport: WORKBENCH_PREVIEW_VIEWPORTS[breakpoint],
      defaults,
    }),
    [breakpoint, defaults]
  );

  return (
    <WorkbenchPreviewContext.Provider value={value}>
      <ServerBreakpointProvider isMobile={breakpoint === "mobile"}>
        <div className={className} style={previewVars} suppressHydrationWarning>
          {children}
        </div>
      </ServerBreakpointProvider>
    </WorkbenchPreviewContext.Provider>
  );
}

export function useWorkbenchPreviewContext(): WorkbenchPreviewContextValue {
  const context = useContext(WorkbenchPreviewContext);
  if (context === undefined) {
    throw new Error("useWorkbenchPreviewContext must be used within WorkbenchPreviewProvider");
  }
  return context;
}

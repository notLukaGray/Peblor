"use client";

import * as React from "react";

type ThemeProviderProps = {
  children: React.ReactNode;
  attribute?: "class" | "data-theme";
  defaultTheme?: string;
  forcedTheme?: string;
  enableSystem?: boolean;
  storageKey?: string;
};

const STORAGE_KEY = "theme";

function normalizeTheme(theme: string): "light" | "dark" {
  return theme === "light" ? "light" : "dark";
}

function readForcedPageTheme(): "light" | "dark" | null {
  const forcedTheme = document.documentElement.dataset.pbForcedTheme;
  return forcedTheme === "light" || forcedTheme === "dark" ? forcedTheme : null;
}

function resolveTheme(
  defaultTheme: string,
  enableSystem: boolean,
  storageKey: string
): "light" | "dark" {
  const stored = window.localStorage.getItem(storageKey);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  if (enableSystem) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return normalizeTheme(defaultTheme);
}

function applyTheme(attribute: "class" | "data-theme", theme: "light" | "dark"): void {
  if (attribute === "class") {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
  } else {
    document.documentElement.setAttribute(attribute, theme);
  }
  // Sync the theme to a cookie so the root layout can read it server-side on the
  // next navigation, setting the correct class on <html> before first paint without
  // needing a blocking inline script.
  document.cookie = `theme=${theme};path=/;max-age=31536000;SameSite=Lax`;
}

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "dark",
  forcedTheme,
  enableSystem = true,
  storageKey = STORAGE_KEY,
}: ThemeProviderProps) {
  React.useLayoutEffect(() => {
    const forcedPageTheme = readForcedPageTheme();
    applyTheme(
      attribute,
      typeof forcedTheme === "string"
        ? normalizeTheme(forcedTheme)
        : forcedPageTheme
          ? forcedPageTheme
          : resolveTheme(defaultTheme, enableSystem, storageKey)
    );
  }, [attribute, defaultTheme, enableSystem, forcedTheme, storageKey]);

  return <>{children}</>;
}

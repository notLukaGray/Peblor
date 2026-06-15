import { globals } from "@pb/runtime-react/core/lib/globals";

export type ForcedTheme = "light" | "dark";

const STORAGE_KEY = "theme";

export function normalizeForcedTheme(value: string | null): ForcedTheme | null {
  return value === "light" || value === "dark" ? value : null;
}

export function resolvePreferredTheme(): ForcedTheme {
  const stored = normalizeForcedTheme(window.localStorage.getItem(STORAGE_KEY));
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : globals.defaultTheme;
}

export function applyForcedTheme(theme: ForcedTheme): void {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
}

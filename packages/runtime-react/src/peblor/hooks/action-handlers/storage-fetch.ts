import type { ActionHandler, ActionHandlerMap } from "./types";
import type { JsonValue } from "@pb/contracts/types";

const handleSetLocalStorage: ActionHandler = (payload) => {
  const { key, value } = (payload ?? {}) as { key?: string; value?: JsonValue };
  if (key == null) {
    console.warn("[peblor] setLocalStorage called without a key");
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("[peblor] Failed to set localStorage:", err);
  }
};

const handleSetSessionStorage: ActionHandler = (payload) => {
  const { key, value } = (payload ?? {}) as { key?: string; value?: JsonValue };
  if (key == null) {
    console.warn("[peblor] setSessionStorage called without a key");
    return;
  }
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("[peblor] Failed to set sessionStorage:", err);
  }
};

const handleSetTheme: ActionHandler = (payload) => {
  const mode = (payload as { mode?: string })?.mode;
  const root = document.documentElement;
  const forcedTheme = root.dataset.pbForcedTheme;
  if (forcedTheme === "light" || forcedTheme === "dark") return;
  const current = root.classList.contains("dark") ? "dark" : "light";
  const next = mode === "toggle" ? (current === "dark" ? "light" : "dark") : mode;
  if (next !== "light" && next !== "dark") return;
  root.classList.remove("light", "dark");
  root.classList.add(next);
  try {
    localStorage.setItem("theme", next);
  } catch (err) {
    console.warn("[peblor] Failed to persist theme:", err);
  }
};

export const STORAGE_FETCH_HANDLERS: ActionHandlerMap = {
  setLocalStorage: handleSetLocalStorage,
  setSessionStorage: handleSetSessionStorage,
  setTheme: handleSetTheme,
};

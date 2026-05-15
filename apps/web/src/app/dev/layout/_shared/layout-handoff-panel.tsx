"use client";

import { useSyncExternalStore } from "react";

export const LAYOUT_HANDOFF_VISIBILITY_STORAGE_KEY = "pb.dev.layout.handoff-panel.visible.v1";
export const LAYOUT_HANDOFF_RESPONSIVE_MIN_WIDTH_PX = 1360;
export const LAYOUT_HANDOFF_VISIBILITY_CHANGED_EVENT = "pb:dev:layout-handoff-visibility-changed";

const STORAGE_VISIBLE = "visible";
const STORAGE_HIDDEN = "hidden";
const VISIBILITY_LOOKUP: Record<string, boolean> = {
  [STORAGE_VISIBLE]: true,
  "1": true,
  true: true,
  [STORAGE_HIDDEN]: false,
  "0": false,
  false: false,
};

export function parseStoredLayoutHandoffVisibility(raw: string | null): boolean | null {
  if (raw == null) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized.length === 0) return null;
  if (!(normalized in VISIBILITY_LOOKUP)) return null;
  const resolved = VISIBILITY_LOOKUP[normalized as keyof typeof VISIBILITY_LOOKUP];
  return typeof resolved === "boolean" ? resolved : null;
}

export function serializeLayoutHandoffVisibility(visible: boolean): string {
  return visible ? STORAGE_VISIBLE : STORAGE_HIDDEN;
}

export function getResponsiveDefaultLayoutHandoffVisibility(viewportWidthPx: number): boolean {
  return viewportWidthPx >= LAYOUT_HANDOFF_RESPONSIVE_MIN_WIDTH_PX;
}

function safeReadVisibilityStorage(): string | null {
  try {
    return localStorage.getItem(LAYOUT_HANDOFF_VISIBILITY_STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeWriteVisibilityStorage(nextVisible: boolean): void {
  try {
    localStorage.setItem(
      LAYOUT_HANDOFF_VISIBILITY_STORAGE_KEY,
      serializeLayoutHandoffVisibility(nextVisible)
    );
  } catch {
    // Ignore persistence failures (private mode / blocked storage).
  }
}

function readHandoffVisibilitySnapshot(): boolean {
  if (typeof window === "undefined") return false;
  const stored = parseStoredLayoutHandoffVisibility(safeReadVisibilityStorage());
  if (stored != null) return stored;
  return getResponsiveDefaultLayoutHandoffVisibility(window.innerWidth);
}

function subscribeToHandoffVisibility(callback: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== LAYOUT_HANDOFF_VISIBILITY_STORAGE_KEY) return;
    callback();
  };
  const onResize = () => {
    if (parseStoredLayoutHandoffVisibility(safeReadVisibilityStorage()) == null) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("resize", onResize);
  window.addEventListener(LAYOUT_HANDOFF_VISIBILITY_CHANGED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("resize", onResize);
    window.removeEventListener(LAYOUT_HANDOFF_VISIBILITY_CHANGED_EVENT, callback);
  };
}

type LayoutHandoffPanelVisibilityState = {
  handoffPanelVisible: boolean;
  toggleHandoffPanel: () => void;
};

export function useLayoutHandoffPanelVisibility(): LayoutHandoffPanelVisibilityState {
  const handoffPanelVisible = useSyncExternalStore(
    subscribeToHandoffVisibility,
    readHandoffVisibilitySnapshot,
    () => false
  );

  const toggleHandoffPanel = () => {
    const next = !handoffPanelVisible;
    safeWriteVisibilityStorage(next);
    window.dispatchEvent(new Event(LAYOUT_HANDOFF_VISIBILITY_CHANGED_EVENT));
  };

  return {
    handoffPanelVisible,
    toggleHandoffPanel,
  };
}

type LayoutHandoffPanelToggleProps = {
  visible: boolean;
  onToggle: () => void;
};

export function LayoutHandoffPanelToggle({ visible, onToggle }: LayoutHandoffPanelToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="rounded border border-border px-2.5 py-1 text-[10px] font-mono uppercase tracking-wide text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      aria-pressed={visible}
      aria-label={visible ? "Hide handoff panel" : "Show handoff panel"}
    >
      {visible ? "Hide handoff" : "Show handoff"}
    </button>
  );
}

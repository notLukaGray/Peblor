"use client";

import { useSyncExternalStore } from "react";

const elementVisibilityListeners = new Map<string, Set<() => void>>();
const elementVisibilityState = new Map<string, boolean>();
let elementVisibilityWindowListener: ((event: Event) => void) | null = null;

function notifyElementVisibility(id: string): void {
  const listeners = elementVisibilityListeners.get(id);
  if (!listeners) return;
  for (const listener of listeners) listener();
}

function ensureElementVisibilityWindowListener(): void {
  if (typeof window === "undefined" || elementVisibilityWindowListener != null) return;
  elementVisibilityWindowListener = (event: Event) => {
    const detail = (event as CustomEvent<{ type: string; id: string }>).detail;
    if (!detail || typeof detail.id !== "string") return;

    const current = elementVisibilityState.get(detail.id) ?? true;
    let next = current;
    if (detail.type === "elementShow") next = true;
    if (detail.type === "elementHide") next = false;
    if (detail.type === "elementToggle") next = !current;
    if (next === current) return;

    elementVisibilityState.set(detail.id, next);
    notifyElementVisibility(detail.id);
  };
  window.addEventListener(
    "peblor-element-visibility",
    elementVisibilityWindowListener as EventListener
  );
}

function maybeRemoveElementVisibilityWindowListener(): void {
  if (typeof window === "undefined" || elementVisibilityWindowListener == null) return;
  if (elementVisibilityListeners.size > 0) return;
  window.removeEventListener(
    "peblor-element-visibility",
    elementVisibilityWindowListener as EventListener
  );
  elementVisibilityWindowListener = null;
  elementVisibilityState.clear();
}

function subscribeElementVisibility(id: string, callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  ensureElementVisibilityWindowListener();
  const listeners = elementVisibilityListeners.get(id) ?? new Set<() => void>();
  listeners.add(callback);
  elementVisibilityListeners.set(id, listeners);

  return () => {
    const current = elementVisibilityListeners.get(id);
    if (!current) return;
    current.delete(callback);
    if (current.size === 0) {
      elementVisibilityListeners.delete(id);
      elementVisibilityState.delete(id);
    }
    maybeRemoveElementVisibilityWindowListener();
  };
}

function getElementVisibilitySnapshot(id: string | undefined): boolean {
  if (!id) return true;
  return elementVisibilityState.get(id) ?? true;
}

/**
 * Mounts on an element with an `id`. Listens for `peblor-element-visibility` events
 * and toggles visibility based on the event detail.
 */
export function useElementVisibilityListener(id: string | undefined): boolean {
  return useSyncExternalStore(
    (callback) => (id ? subscribeElementVisibility(id, callback) : () => {}),
    () => getElementVisibilitySnapshot(id),
    () => true
  );
}

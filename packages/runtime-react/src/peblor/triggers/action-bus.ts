"use client";

type ActionHandler = (action: unknown) => void;

// elementId → handler. Only one handler per element (the element's own useEffect).
const elementSubscribers = new Map<string, ActionHandler>();

/**
 * Register a handler for actions targeting a specific element id.
 * Returns a cleanup function (call it from useEffect return).
 */
export function subscribeToElementActions(elementId: string, handler: ActionHandler): () => void {
  elementSubscribers.set(elementId, handler);
  return () => {
    elementSubscribers.delete(elementId);
  };
}

/**
 * Route an action to its specific element subscriber if one exists.
 * Returns true if the action was handled by a direct subscriber (caller should skip window event).
 * Returns false if no direct subscriber found (caller should fall back to window broadcast).
 */
export function routeElementAction(action: unknown): boolean {
  if (!action || typeof action !== "object") return false;
  const a = action as Record<string, unknown>;
  const payload = a.payload as Record<string, unknown> | undefined;
  const targetId = typeof payload?.id === "string" ? payload.id.trim() : null;
  if (!targetId || targetId === "all" || targetId === "*") return false; // broadcast — don't intercept

  const handler = elementSubscribers.get(targetId);
  if (!handler) return false; // target not mounted — fall through to window
  handler(action);
  return true;
}

"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Standard return type for all form server actions.
 * - `error` displays an inline error in the form.
 * - `redirect` navigates the browser client-side.
 */
export type ActionResult = {
  error?: string;
  redirect?: string;
};

/**
 * Signature for a server action that processes a form submission.
 * Receives the flat key-value payload assembled from form fields
 * plus any action-level static payload.
 */
export type FormActionFn = (
  data: Record<string, string | string[] | boolean>
) => Promise<ActionResult>;

const FormActionContext = createContext<Record<string, FormActionFn> | null>(null);

/**
 * Provider that injects server actions into the Peblor rendering tree.
 * Must be rendered in a Server Component that has access to the
 * `"use server"` functions (typically the page layout or catch-all page).
 *
 * Children receive the actions via the `useFormAction` hook.
 */
export function FormActionProvider({
  actions,
  children,
}: {
  actions: Record<string, FormActionFn>;
  children: ReactNode;
}) {
  return <FormActionContext.Provider value={actions}>{children}</FormActionContext.Provider>;
}

/**
 * Returns the registered server action for the given form handler key.
 * Returns `null` when no provider is in the tree or the key is unknown —
 * callers should fall back to the classic `fetch()` path.
 */
export function useFormAction(actionKey: string): FormActionFn | null {
  const actions = useContext(FormActionContext);
  if (!actions) return null;
  return actions[actionKey] ?? null;
}

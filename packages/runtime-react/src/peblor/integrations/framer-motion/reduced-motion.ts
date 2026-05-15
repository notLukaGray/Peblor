"use client";

import { useReducedMotion } from "./accessibility";

export function useShouldReduceMotion(ignorePreference?: boolean): boolean {
  const prefersReduced = useReducedMotion();
  if (ignorePreference) return false;
  return Boolean(prefersReduced);
}

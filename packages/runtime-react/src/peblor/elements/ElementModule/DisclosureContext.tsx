"use client";

import { createContext, useContext } from "react";

type DisclosureContextValue = {
  triggerKeys: Set<string>;
  toggle: () => void;
};

const DisclosureContext = createContext<DisclosureContextValue | null>(null);

export const DisclosureProvider = DisclosureContext.Provider;

export function useDisclosureContext(): DisclosureContextValue | null {
  return useContext(DisclosureContext);
}

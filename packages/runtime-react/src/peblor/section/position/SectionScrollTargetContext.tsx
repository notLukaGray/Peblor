"use client";

import { createContext, useContext, type RefObject } from "react";

export const SectionScrollTargetContext = createContext<RefObject<HTMLElement | null> | null>(null);

export function SectionScrollTargetProvider({
  sectionRef,
  children,
}: {
  sectionRef: RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  return (
    <SectionScrollTargetContext.Provider value={sectionRef}>
      {children}
    </SectionScrollTargetContext.Provider>
  );
}

export function useSectionScrollTarget(): RefObject<HTMLElement | null> | null {
  return useContext(SectionScrollTargetContext);
}

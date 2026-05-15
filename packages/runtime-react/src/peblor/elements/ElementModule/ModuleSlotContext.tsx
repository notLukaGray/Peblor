"use client";

import { createContext, useContext } from "react";
import type { SectionDefinitionBlock } from "@pb/contracts/types";

const SlotDefaultWrapperStyleContext = createContext<Record<string, unknown> | undefined>(
  undefined
);

/** When inside a module slot, definitions from slot.section.definitions (elements + cssGradient for wrapper refs). */
const SlotDefinitionsContext = createContext<Record<string, SectionDefinitionBlock> | null>(null);

/** When inside a contentBlock, section.definitions (elements + cssGradient for wrapper refs). */
const SectionDefinitionsContext = createContext<Record<string, SectionDefinitionBlock> | null>(
  null
);

export function useSlotDefaultWrapperStyle(): Record<string, unknown> {
  return useContext(SlotDefaultWrapperStyleContext) ?? {};
}

export function useSlotDefinitions(): Record<string, SectionDefinitionBlock> | null {
  return useContext(SlotDefinitionsContext);
}

export function useSectionDefinitions(): Record<string, SectionDefinitionBlock> | null {
  return useContext(SectionDefinitionsContext);
}

/** Resolve definitions: module slot first, then section (contentBlock) definitions. */
export function useDefinitions(): Record<string, SectionDefinitionBlock> | null {
  const slot = useSlotDefinitions();
  const section = useSectionDefinitions();
  return slot ?? section;
}

export { SlotDefaultWrapperStyleContext, SlotDefinitionsContext, SectionDefinitionsContext };

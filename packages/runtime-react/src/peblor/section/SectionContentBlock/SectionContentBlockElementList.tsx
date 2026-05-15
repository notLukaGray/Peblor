import type {
  ElementBlock,
  SectionDefinitionBlock,
} from "@pb/contracts/peblor/core/peblor-schemas";
import { generateElementKey } from "@pb/core/keys";
import { ElementErrorBoundary } from "@/peblor/SectionErrorBoundary";
import { ElementRenderer } from "@/peblor/elements/Shared/ElementRenderer";
import { SectionDefinitionsContext } from "@/peblor/elements/ElementModule/ModuleSlotContext";

type Props = {
  elements: ElementBlock[];
  sectionDefinitions?: Record<string, SectionDefinitionBlock>;
};

export function SectionContentBlockElementList({ elements, sectionDefinitions }: Props) {
  return (
    <SectionDefinitionsContext.Provider value={sectionDefinitions ?? null}>
      {elements.map((block, i) => {
        const key = generateElementKey(block, i);
        return (
          <ElementErrorBoundary key={key} elementKey={key}>
            <ElementRenderer block={block} />
          </ElementErrorBoundary>
        );
      })}
    </SectionDefinitionsContext.Provider>
  );
}

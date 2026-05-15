import type { ElementBlock } from "@pb/contracts/types";
import { reconcileElementOrderWithDefinitions } from "@pb/core/modules";
import { ClientMixedElementGroupShell } from "../../client-islands/ClientMixedElementGroupShell";
import { ServerElementRenderer } from "../ServerElementRenderer";

type GroupBlock = Extract<ElementBlock, { type: "elementGroup" }>;

type Props = GroupBlock & { serverIsMobile?: boolean };

export function MixedServerElementGroup({ section, serverIsMobile, ...rest }: Props) {
  const definitions = (section?.definitions ?? {}) as Record<string, unknown>;
  const order = reconcileElementOrderWithDefinitions(section?.elementOrder, definitions);

  const idCounts = new Map<string, number>();
  const blocks = order
    .map((key): (ElementBlock & { id: string }) | null => {
      const child = definitions[key];
      if (
        !child ||
        typeof child !== "object" ||
        !("type" in child) ||
        (child as { type?: string }).type === "cssGradient"
      )
        return null;
      const candidate = child as ElementBlock & { id?: string };
      const baseId =
        typeof candidate.id === "string" && candidate.id.trim().length > 0 ? candidate.id : key;
      const nextCount = (idCounts.get(baseId) ?? 0) + 1;
      idCounts.set(baseId, nextCount);
      const uniqueId = nextCount === 1 ? baseId : `${baseId}__${nextCount}`;
      return { ...candidate, id: uniqueId } as ElementBlock & { id: string };
    })
    .filter((b): b is ElementBlock & { id: string } => b != null);

  return (
    <ClientMixedElementGroupShell {...rest}>
      {blocks.map((block) => (
        <ServerElementRenderer key={block.id} block={block} serverIsMobile={serverIsMobile} />
      ))}
    </ClientMixedElementGroupShell>
  );
}

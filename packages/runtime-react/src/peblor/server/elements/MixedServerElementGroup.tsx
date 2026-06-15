/**
 * Mixed server/client element group.
 *
 * Renders child elements on the server (SSR) via ServerElementRenderer, and
 * delegates all group layout (flex direction, gap, padding, stagger, border
 * gradient, glass effect, interactions) to the client island
 * (ClientMixedElementGroupShell → MixedElementGroupIsland).
 *
 * This split is intentional: child elements are rendered server-side for SEO,
 * while the group's layout requires client-side hooks (useDeviceType, theme,
 * framer-motion variants for stagger, etc.).
 *
 * Key server-side responsibility: when the parent group has staggerChildren,
 * per-child motionTiming is stripped (see adjustedBlocks below) so children
 * don't fight the stagger container's animation variants.
 *
 * Layout responsibilities:
 *   - Server: element ordering, stagger-aware motionTiming stripping
 *   - Client (MixedElementGroupIsland): flex layout, gap, padding, stagger,
 *     border gradient, glass effect, interactions (click/hover/etc.)
 */

import type { ElementBlock } from "@pb/contracts/types";
import { reconcileElementOrderWithDefinitions } from "@pb/core/modules";
import { ClientMixedElementGroupShell } from "../../client-islands/ClientMixedElementGroupShell";
import { ServerElementRenderer } from "../ServerElementRenderer";

type GroupBlock = Extract<ElementBlock, { type: "elementGroup" }>;

type Props = GroupBlock & { serverIsMobile?: boolean };

export function MixedServerElementGroup({ section, serverIsMobile, ...rest }: Props) {
  const definitions = (section?.definitions ?? {}) as Record<string, unknown>;
  const order = reconcileElementOrderWithDefinitions(section?.elementOrder, definitions);

  const motionTiming = (rest as Record<string, unknown>).motionTiming as
    | Record<string, unknown>
    | undefined;
  const staggerChildren = motionTiming?.staggerChildren as number | undefined;

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

  // When the parent group has a stagger animation, individual child entrance motions
  // would conflict with the stagger container's orchestration. Stripping per-child
  // motionTiming ensures children animate via the stagger container's variants
  // (entrance preset on the group) rather than fighting with their own entrance
  // timing. The stagger container's variants already define the entrance animation
  // (initial/animate) for each child via motion.div variants — per-child motionTiming
  // would add redundant whileInView that overrides the stagger sequence.
  const adjustedBlocks = staggerChildren
    ? blocks.map((block) => {
        const asRecord = block as Record<string, unknown>;
        if ("motionTiming" in asRecord) {
          const { motionTiming: _mt, ...restBlock } = asRecord;
          return restBlock as ElementBlock & { id: string };
        }
        return block;
      })
    : blocks;

  return (
    <ClientMixedElementGroupShell {...rest}>
      {adjustedBlocks.map((block) => (
        <ServerElementRenderer key={block.id} block={block} serverIsMobile={serverIsMobile} />
      ))}
    </ClientMixedElementGroupShell>
  );
}

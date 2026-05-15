/**
 * Converts individual Figma Action objects to peblor TriggerAction objects.
 */

import type { TriggerAction } from "../types/peblor";

/**
 * Slugifies a Figma node name for use as a peblor element ID.
 */
function slugifyNodeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Converts a Figma `Action` object to a peblor `TriggerAction`.
 * Returns undefined if the action type cannot be meaningfully converted.
 */
export function convertFigmaAction(
  action: Action,
  exportNotes: string[]
): TriggerAction | undefined {
  const a = action as unknown as {
    type: string;
    url?: string;
    destinationId?: string;
    overlayId?: string;
    variableId?: string;
    variableValue?: unknown;
    transitionNodeID?: string;
    scrollOffset?: { x?: number; y?: number };
  };

  switch (a.type) {
    case "URL":
    case "OPEN_URL": {
      if (!a.url) return undefined;
      const isExternal =
        a.url.startsWith("http://") || a.url.startsWith("https://") || a.url.startsWith("//");
      if (isExternal) {
        exportNotes.push(
          `[prototype] URL action mapped to navigate with external href "${a.url}". ` +
            `Consider wrapping in an <a target="_blank"> or using openExternalUrl if your runtime supports it.`
        );
      }
      return { type: "navigate", payload: { href: a.url } };
    }

    case "BACK": {
      return { type: "navigate", payload: { back: true } } as TriggerAction;
    }

    case "NODE":
    case "NAVIGATE": {
      const destId = a.destinationId ?? a.transitionNodeID;
      if (!destId) return undefined;

      let destName: string | undefined;
      try {
        const destNode = figma.getNodeById(destId);
        if (destNode?.name) destName = destNode.name;
      } catch {
        // figma.getNodeById may throw if node is in an external file — ignore.
      }

      exportNotes.push(
        `[prototype] NAVIGATE action links to Figma frame "${destName ?? destId}". ` +
          `The frameId "${destId}" is a Figma-internal ID. ` +
          `Replace payload.href with the correct peblor route path before publishing.`
      );
      return {
        type: "navigate",
        payload: {
          href: destName ? `/${slugifyNodeName(destName)}` : `#frame-${destId}`,
          frameId: destId,
        },
      } as TriggerAction;
    }

    case "CLOSE": {
      return { type: "modalClose", payload: {} };
    }

    case "OVERLAY_OPEN":
    case "OPEN_OVERLAY": {
      const rawId = a.overlayId ?? a.destinationId;
      if (!rawId) return undefined;

      let modalId: string = `frame-${rawId}`;
      try {
        const overlayNode = figma.getNodeById(rawId);
        if (overlayNode?.name) {
          modalId = slugifyNodeName(overlayNode.name);
          exportNotes.push(
            `[prototype] OPEN_OVERLAY mapped to modalOpen with id "${modalId}" ` +
              `(resolved from frame "${overlayNode.name}"). ` +
              `Confirm this ID is registered in your peblor modal definitions.`
          );
        } else {
          exportNotes.push(
            `[prototype] OPEN_OVERLAY mapped to modalOpen with frameId "${rawId}". ` +
              `Could not resolve frame name — update id manually before publishing.`
          );
        }
      } catch {
        exportNotes.push(
          `[prototype] OPEN_OVERLAY mapped to modalOpen with frameId "${rawId}". ` +
            `Node lookup failed (may be in an external file) — update id manually.`
        );
      }

      return { type: "modalOpen", payload: { id: modalId } } as TriggerAction;
    }

    case "SWAP_OVERLAY": {
      const rawId = a.overlayId ?? a.destinationId;
      if (!rawId) return undefined;

      let modalId: string = `frame-${rawId}`;
      try {
        const overlayNode = figma.getNodeById(rawId);
        if (overlayNode?.name) {
          modalId = slugifyNodeName(overlayNode.name);
          exportNotes.push(
            `[prototype] SWAP_OVERLAY mapped to modalOpen with id "${modalId}" ` +
              `(resolved from frame "${overlayNode.name}"). ` +
              `Note: SWAP vs OPEN distinction is not modelled — both emit modalOpen. ` +
              `Confirm this ID is registered in your peblor modal definitions.`
          );
        } else {
          exportNotes.push(
            `[prototype] SWAP_OVERLAY mapped to modalOpen with frameId "${rawId}". ` +
              `Could not resolve frame name — update id manually before publishing.`
          );
        }
      } catch {
        exportNotes.push(
          `[prototype] SWAP_OVERLAY mapped to modalOpen with frameId "${rawId}". ` +
            `Node lookup failed — update id manually.`
        );
      }

      return { type: "modalOpen", payload: { id: modalId } } as TriggerAction;
    }

    case "SCROLL_TO": {
      const destId = a.destinationId ?? a.transitionNodeID;
      if (!destId) return undefined;

      let scrollId: string | undefined;
      try {
        const destNode = figma.getNodeById(destId);
        if (destNode?.name) {
          scrollId = slugifyNodeName(destNode.name);
          exportNotes.push(
            `[prototype] SCROLL_TO mapped to scrollTo with id "${scrollId}" ` +
              `(resolved from node "${destNode.name}"). ` +
              `Ensure the target element has id="${scrollId}" in the peblor output.`
          );
        } else {
          exportNotes.push(
            `[prototype] SCROLL_TO action — destination node "${destId}" could not be resolved. ` +
              `Set scrollTo payload.id manually to the target element's peblor id.`
          );
        }
      } catch {
        exportNotes.push(
          `[prototype] SCROLL_TO action — node lookup failed for "${destId}". ` +
            `Set scrollTo payload.id manually.`
        );
      }

      return {
        type: "scrollTo",
        payload: scrollId ? { id: scrollId } : {},
      } as TriggerAction;
    }

    case "SET_VARIABLE": {
      return {
        type: "setVariable",
        payload: {
          key: a.variableId ?? "",
          value: a.variableValue ?? null,
        },
      };
    }

    case "SWAP_STATE":
    case "CONDITIONAL":
    case "UPDATE_MEDIA_RUNTIME":
    default:
      return undefined;
  }
}

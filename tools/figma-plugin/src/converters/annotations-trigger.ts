/**
 * Trigger action shorthand parsing — converts "actionType:param" strings to TriggerAction objects.
 */

import type { TriggerAction } from "../types/peblor";

/**
 * Parses a trigger action shorthand into a TriggerAction object.
 * Shorthand format: "actionType:param"
 *
 * @example
 * parseTriggerShorthand("elementShow:hero-text")
 * // → { type: "elementShow", payload: { id: "hero-text" } }
 *
 * parseTriggerShorthand("navigate:/about")
 * // → { type: "navigate", payload: { href: "/about" } }
 *
 * Returns null if format not recognized.
 */
export function parseTriggerShorthand(shorthand: string): TriggerAction | null {
  const colonIndex = shorthand.indexOf(":");
  const actionType = colonIndex === -1 ? shorthand.trim() : shorthand.slice(0, colonIndex).trim();
  const param = colonIndex === -1 ? "" : shorthand.slice(colonIndex + 1).trim();

  if (!actionType) return null;

  switch (actionType) {
    case "elementShow":
      if (!param) return null;
      return { type: "elementShow", payload: { id: param } };

    case "elementHide":
      if (!param) return null;
      return { type: "elementHide", payload: { id: param } };

    case "elementToggle":
      if (!param) return null;
      return { type: "elementToggle", payload: { id: param } };

    case "navigate":
      if (!param) return null;
      if (param === "back") return { type: "navigate", payload: { back: true } } as TriggerAction;
      return { type: "navigate", payload: { href: param } };

    case "modalOpen":
      if (!param) return null;
      return { type: "modalOpen", payload: { id: param } };

    case "modalClose":
      return param ? { type: "modalClose", payload: { id: param } } : { type: "modalClose" };

    case "scrollTo":
      return param ? { type: "scrollTo", payload: { id: param } } : { type: "scrollTo" };

    case "setVariable": {
      const eqIndex = param.indexOf("=");
      const colonIdx = param.indexOf(":");
      if (eqIndex !== -1) {
        const key = param.slice(0, eqIndex).trim();
        const value = param.slice(eqIndex + 1).trim();
        if (!key) return null;
        return { type: "setVariable", payload: { key, value } };
      }
      if (colonIdx !== -1) {
        const key = param.slice(0, colonIdx).trim();
        const value = param.slice(colonIdx + 1).trim();
        if (!key) return null;
        return { type: "setVariable", payload: { key, value } };
      }
      return null;
    }

    case "fireTransition":
      if (!param) return null;
      return { type: "fireTransition", payload: { id: param } } as TriggerAction;

    case "updateTransitionProgress":
      if (!param) return null;
      return { type: "updateTransitionProgress", payload: { id: param } } as TriggerAction;

    default:
      return param ? { type: actionType, payload: param } : { type: actionType };
  }
}

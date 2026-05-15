/**
 * Internal shorthand parsers for section trigger annotations.
 * Used exclusively by section-triggers.ts.
 */

import { parseTriggerShorthand } from "./annotations-trigger";

/**
 * Collects all annotation keys matching `baseKey`, `baseKey2`, `baseKey3`, etc.
 * Returns an array of their values in order.
 */
export function collectKeyedValues(annotations: Record<string, string>, baseKey: string): string[] {
  const results: string[] = [];
  if (annotations[baseKey] !== undefined) results.push(annotations[baseKey]);
  let n = 2;
  while (annotations[`${baseKey}${n}`] !== undefined) {
    results.push(annotations[`${baseKey}${n}`]);
    n++;
  }
  return results;
}

/**
 * Parses a timer shorthand string into a timer trigger entry.
 * Format: `delay:actionType:param`
 */
export function parseTimerShorthand(
  value: string
): { delay?: number; interval?: number; action: unknown } | null {
  const parts = value.split(":");
  if (parts.length < 2) return null;

  const delayMs = parseFloat(parts[0]);
  if (isNaN(delayMs)) return null;

  const actionType = parts[1].trim();
  const param = parts.slice(2).join(":").trim();
  const action = parseTriggerShorthand(param ? `${actionType}:${param}` : actionType);
  if (!action) return null;

  return { delay: delayMs, action };
}

/**
 * Parses a timerInterval shorthand: `delay:interval:actionType:param`.
 */
export function parseTimerIntervalShorthand(
  value: string
): { delay?: number; interval?: number; action: unknown } | null {
  const parts = value.split(":");
  if (parts.length < 3) return null;

  const delay = parseFloat(parts[0]);
  const interval = parseFloat(parts[1]);
  if (isNaN(delay) || isNaN(interval)) return null;

  const actionType = parts[2].trim();
  const param = parts.slice(3).join(":").trim();
  const action = parseTriggerShorthand(param ? `${actionType}:${param}` : actionType);
  if (!action) return null;

  return { delay, interval, action };
}

/**
 * Parses a keyboard shorthand: `key+modifier:actionType:param` or `key:actionType:param`.
 */
export function parseKeyShorthand(value: string): Record<string, unknown> | null {
  const colonIdx = value.indexOf(":");
  if (colonIdx === -1) return null;

  const keyToken = value.slice(0, colonIdx).trim();
  const rest = value.slice(colonIdx + 1).trim();
  if (!keyToken || !rest) return null;

  const keyParts = keyToken.split("+");
  const key = keyParts[0].trim();
  const modifiers = keyParts.slice(1).map((m) => m.trim().toLowerCase());

  const entry: Record<string, unknown> = { key };
  if (modifiers.includes("ctrl")) entry.ctrl = true;
  if (modifiers.includes("shift")) entry.shift = true;
  if (modifiers.includes("alt")) entry.alt = true;
  if (modifiers.includes("meta")) entry.meta = true;

  const action = parseTriggerShorthand(rest);
  if (action) entry.onKeyDown = action;

  return entry;
}

/**
 * Parses an effect shorthand: `type:param` or just `type`.
 * Known types: parallax, scrollFade (→ fade), blur, glass.
 */
export function parseEffectShorthand(value: string): Record<string, unknown> | null {
  const colonIdx = value.indexOf(":");
  const effectType = colonIdx === -1 ? value.trim() : value.slice(0, colonIdx).trim();
  const param = colonIdx === -1 ? "" : value.slice(colonIdx + 1).trim();

  if (!effectType) return null;

  switch (effectType.toLowerCase()) {
    case "parallax": {
      const speed = param ? parseFloat(param) : undefined;
      return speed !== undefined && !isNaN(speed)
        ? { type: "parallax", speed }
        : { type: "parallax" };
    }
    case "scrollfade":
      return { type: "fade" };
    case "blur": {
      const amount = param ? parseFloat(param) : undefined;
      return amount !== undefined && !isNaN(amount) ? { type: "blur", amount } : { type: "blur" };
    }
    case "glass": {
      const entry: Record<string, unknown> = { type: "glass" };
      if (!param) return entry;

      // Simple numeric shorthand: `glass:20` or `glass:20px` -> frost blur
      if (/^[0-9.]+px$/i.test(param)) {
        entry.frost = param;
        return entry;
      }
      const numeric = Number(param);
      if (!isNaN(numeric) && param.trim() !== "") {
        entry.frost = `${numeric}px`;
        return entry;
      }

      // Key/value shorthand:
      // `glass:frost=18px,refraction=0.45,lightIntensity=0.5,depth=1.4,dispersion=0.2,lightAngle=35`
      const tokens = param
        .split(/[;,]/)
        .map((part) => part.trim())
        .filter(Boolean);
      for (const token of tokens) {
        const dividerIdx = token.includes("=") ? token.indexOf("=") : token.indexOf(":");
        if (dividerIdx <= 0) continue;
        const key = token.slice(0, dividerIdx).trim().toLowerCase();
        const raw = token.slice(dividerIdx + 1).trim();
        if (!raw) continue;

        if (key === "frost" || key === "blur" || key === "radius") {
          entry.frost = /^[0-9.]+px$/i.test(raw)
            ? raw
            : !isNaN(Number(raw))
              ? `${Number(raw)}px`
              : raw;
          continue;
        }
        if (key === "light" || key === "lightintensity") {
          const n = Number(raw);
          if (!isNaN(n)) entry.lightIntensity = n;
          continue;
        }
        if (key === "angle" || key === "lightangle") {
          const n = Number(raw);
          if (!isNaN(n)) entry.lightAngle = n;
          continue;
        }
        if (key === "refraction") {
          const n = Number(raw);
          if (!isNaN(n)) entry.refraction = n;
          continue;
        }
        if (key === "depth") {
          const n = Number(raw);
          if (!isNaN(n)) entry.depth = n;
          continue;
        }
        if (key === "dispersion") {
          const n = Number(raw);
          if (!isNaN(n)) entry.dispersion = n;
          continue;
        }
        if (key === "displacement" || key === "displacementscale") {
          const n = Number(raw);
          if (!isNaN(n)) entry.displacementScale = n;
          continue;
        }
        if (key === "bluramount") {
          const n = Number(raw);
          if (!isNaN(n)) entry.blurAmount = n;
          continue;
        }
        if (key === "saturation") {
          const n = Number(raw);
          if (!isNaN(n)) entry.saturation = n;
          continue;
        }
        if (key === "aberration" || key === "aberrationintensity") {
          const n = Number(raw);
          if (!isNaN(n)) entry.aberrationIntensity = n;
          continue;
        }
        if (key === "elasticity") {
          const n = Number(raw);
          if (!isNaN(n)) entry.elasticity = n;
          continue;
        }
        if (key === "reflection") {
          const n = Number(raw);
          if (!isNaN(n)) entry.reflection = n;
          continue;
        }
        if (key === "overlight") {
          const normalized = raw.toLowerCase();
          if (normalized === "true" || normalized === "1") entry.overLight = true;
          if (normalized === "false" || normalized === "0") entry.overLight = false;
          continue;
        }
        if (key === "mousefollow" || key === "followmouse") {
          const normalized = raw.toLowerCase();
          if (normalized === "true" || normalized === "1") entry.mouseFollow = true;
          if (normalized === "false" || normalized === "0") entry.mouseFollow = false;
          continue;
        }
        if (key === "splay") {
          const n = Number(raw);
          if (!isNaN(n)) entry.splay = n;
          continue;
        }
        if (key === "mode") {
          const mode = raw.toLowerCase();
          if (
            mode === "standard" ||
            mode === "polar" ||
            mode === "prominent" ||
            mode === "shader"
          ) {
            entry.mode = mode;
          }
        }
      }
      return entry;
    }
    default:
      return param ? { type: effectType, param } : { type: effectType };
  }
}

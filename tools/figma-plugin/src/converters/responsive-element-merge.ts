/**
 * Element-level responsive merge — merges element objects from mobile and desktop artboards.
 */

import { ELEMENT_RESPONSIVE_KEYS } from "./responsive-field-sets";

export type AnyObj = Record<string, unknown>;

/**
 * Deep-equal check for primitive-ish values.
 * Sufficient for responsive field comparison (complex objects like interactions
 * are never responsive, so JSON.stringify is adequate).
 */
export function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

/**
 * Merges two `section` sub-objects that live inside an elementGroup.
 */
function mergeSectionGroupObj(mobile: AnyObj, desktop: AnyObj): AnyObj {
  const result: AnyObj = {};

  if ("elementOrder" in mobile || "elementOrder" in desktop) {
    const mOrder = mobile["elementOrder"] as string[] | undefined;
    const dOrder = desktop["elementOrder"] as string[] | undefined;
    if (mOrder !== undefined && dOrder !== undefined) {
      result["elementOrder"] = valuesEqual(mOrder, dOrder)
        ? dOrder
        : { mobile: mOrder, desktop: dOrder };
    } else {
      result["elementOrder"] = dOrder ?? mOrder;
    }
  }

  if ("definitions" in mobile || "definitions" in desktop) {
    const mDefs = (mobile["definitions"] ?? {}) as Record<string, AnyObj>;
    const dDefs = (desktop["definitions"] ?? {}) as Record<string, AnyObj>;
    const allIds = new Set([...Object.keys(mDefs), ...Object.keys(dDefs)]);
    const mergedDefs: Record<string, AnyObj> = {};
    for (const id of allIds) {
      if (id in mDefs && id in dDefs) {
        mergedDefs[id] = mergeElements(mDefs[id], dDefs[id]);
      } else {
        mergedDefs[id] = dDefs[id] ?? mDefs[id];
      }
    }
    result["definitions"] = mergedDefs;
  }

  for (const key of Object.keys({ ...mobile, ...desktop })) {
    if (key === "elementOrder" || key === "definitions") continue;
    result[key] = desktop[key] !== undefined ? desktop[key] : mobile[key];
  }

  return result;
}

/**
 * Merges two parallel arrays of elements.
 * Elements are matched first by `id`, then by position index as fallback.
 */
export function mergeElementArrays(mobile: AnyObj[], desktop: AnyObj[]): AnyObj[] {
  const mById = new Map<string, AnyObj>();
  const dById = new Map<string, AnyObj>();

  for (const el of mobile) {
    const id = el["id"] as string | undefined;
    if (id) mById.set(id, el);
  }
  for (const el of desktop) {
    const id = el["id"] as string | undefined;
    if (id) dById.set(id, el);
  }

  const result: AnyObj[] = [];
  const seen = new Set<string>();
  const orderedIds: Array<{ id: string | null; dIdx: number; mIdx: number }> = [];

  for (let i = 0; i < desktop.length; i++) {
    const id = desktop[i]["id"] as string | undefined;
    if (id && !seen.has(id)) {
      seen.add(id);
      orderedIds.push({ id, dIdx: i, mIdx: -1 });
    } else if (!id) {
      orderedIds.push({ id: null, dIdx: i, mIdx: i });
    }
  }

  for (let i = 0; i < mobile.length; i++) {
    const id = mobile[i]["id"] as string | undefined;
    if (id && !seen.has(id)) {
      seen.add(id);
      orderedIds.push({ id, dIdx: -1, mIdx: i });
    }
  }

  for (const entry of orderedIds) {
    if (entry.id && entry.mIdx === -1) {
      const mEl = mById.get(entry.id);
      if (mEl) {
        entry.mIdx = mobile.indexOf(mEl);
      }
    }
  }

  for (const { dIdx, mIdx } of orderedIds) {
    const mEl = mIdx >= 0 ? mobile[mIdx] : undefined;
    const dEl = dIdx >= 0 ? desktop[dIdx] : undefined;

    if (mEl && dEl) {
      result.push(mergeElements(mEl, dEl));
    } else if (dEl) {
      result.push(dEl);
    } else if (mEl) {
      result.push(mEl);
    }
  }

  return result;
}

/**
 * Merges two element objects recursively.
 * Responsive keys that differ become [mobileValue, desktopValue] tuples.
 */
export function mergeElements(mobile: AnyObj, desktop: AnyObj): AnyObj {
  const result: AnyObj = {};

  const keys = new Set([...Object.keys(mobile), ...Object.keys(desktop)]);

  for (const key of keys) {
    const mVal = mobile[key];
    const dVal = desktop[key];

    const hasMobile = key in mobile;
    const hasDesktop = key in desktop;

    if (!hasMobile) {
      result[key] = dVal;
      continue;
    }
    if (!hasDesktop) {
      result[key] = mVal;
      continue;
    }

    if (ELEMENT_RESPONSIVE_KEYS.has(key)) {
      if (valuesEqual(mVal, dVal)) {
        result[key] = dVal;
      } else {
        result[key] = [mVal, dVal];
      }
      continue;
    }

    if (
      key === "section" &&
      mVal !== null &&
      dVal !== null &&
      typeof mVal === "object" &&
      typeof dVal === "object" &&
      !Array.isArray(mVal) &&
      !Array.isArray(dVal)
    ) {
      result[key] = mergeSectionGroupObj(mVal as AnyObj, dVal as AnyObj);
      continue;
    }

    if (key === "elements" && Array.isArray(mVal) && Array.isArray(dVal)) {
      result[key] = mergeElementArrays(mVal as AnyObj[], dVal as AnyObj[]);
      continue;
    }

    result[key] = dVal;
  }

  return result;
}

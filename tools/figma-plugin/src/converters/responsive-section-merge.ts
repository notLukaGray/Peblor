/**
 * Top-level section merge for the two-artboard responsive system.
 */

import { SECTION_RESPONSIVE_KEYS } from "./responsive-field-sets";
import { valuesEqual, mergeElementArrays, type AnyObj } from "./responsive-element-merge";

/**
 * Merges two converted section blocks — one from a `Section[Mobile]/` frame
 * and one from a `Section[Desktop]/` frame — into a single responsive section.
 *
 * Rules:
 * - Section-level responsive keys that differ → [mobileValue, desktopValue]
 * - `elements` array → merged recursively by element id / position
 * - All other keys → desktop wins, fallback to mobile
 */
export function mergeResponsiveSections(mobile: AnyObj, desktop: AnyObj): AnyObj {
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

    if (key === "elements" && Array.isArray(mVal) && Array.isArray(dVal)) {
      result[key] = mergeElementArrays(mVal as AnyObj[], dVal as AnyObj[]);
      continue;
    }

    if (SECTION_RESPONSIVE_KEYS.has(key)) {
      if (valuesEqual(mVal, dVal)) {
        result[key] = dVal;
      } else {
        result[key] = [mVal, dVal];
      }
      continue;
    }

    result[key] = dVal;
  }

  return result;
}

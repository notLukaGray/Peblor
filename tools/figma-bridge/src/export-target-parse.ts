import { slugify } from "./slugify";
import { stripAnnotations } from "./annotations-strip";

const KNOWN_PREFIXES = new Set([
  "page",
  "section",
  "section[desktop]",
  "section[mobile]",
  "modal",
  "module",
  "button",
  "background",
  "global",
]);

export type ParsedExportTargetKind =
  | "page"
  | "preset"
  | "modal"
  | "module"
  | "global-button"
  | "global-background"
  | "global-element";

export interface ParsedExportTarget {
  kind: ParsedExportTargetKind;
  key: string;
  label: string;
  responsiveRole?: "desktop" | "mobile";
}

function splitPrefixName(name: string): { prefix: string; rest: string; hasSlash: boolean } {
  const slashIdx = name.indexOf("/");
  if (slashIdx < 0) {
    return { prefix: "", rest: name, hasSlash: false };
  }
  return {
    prefix: name.slice(0, slashIdx).trim().toLowerCase(),
    rest: name.slice(slashIdx + 1).trim(),
    hasSlash: true,
  };
}

/** Resolve `Prefix/Name` from a raw Figma layer name (annotations stripped inside). */
export function parseExportTargetFromLayerName(rawName: string): ParsedExportTarget {
  const name = stripAnnotations(rawName || "untitled");
  const { prefix, rest } = splitPrefixName(name);
  const key = slugify(rest || name);
  const label = rest || name;

  switch (prefix) {
    case "page":
      return { kind: "page", key, label };
    case "section":
      return { kind: "preset", key, label };
    case "section[desktop]":
      return { kind: "preset", key, label, responsiveRole: "desktop" };
    case "section[mobile]":
      return { kind: "preset", key, label, responsiveRole: "mobile" };
    case "modal":
      return { kind: "modal", key, label };
    case "module":
      return { kind: "module", key, label };
    case "button":
      return { kind: "global-button", key, label };
    case "background":
      return { kind: "global-background", key, label };
    case "global":
      return { kind: "global-element", key, label };
    default:
      return { kind: "page", key: slugify(name), label: name };
  }
}

/** Prefix diagnostics for unknown `foo/...` patterns (warnings only). */
export function getLayerPrefixDiagnostics(rawName: string): string[] {
  const name = stripAnnotations(rawName || "untitled");
  const { prefix, rest, hasSlash } = splitPrefixName(name);
  const diagnostics: string[] = [];
  if (!hasSlash) return diagnostics;
  if (!rest) {
    diagnostics.push(`Frame "${name}" has no name after "/".`);
  }
  if (!KNOWN_PREFIXES.has(prefix)) {
    diagnostics.push(
      `Unknown prefix "${prefix || "(empty)"}" — export defaults to page; use Page/, Section/, Module/, etc.`
    );
  }
  return diagnostics;
}

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { BunnyFontMeta } from "@/app/dev/fonts/page";
import {
  deriveLocalDisplayFamily,
  inferWeightStyleFromFileName,
} from "@/app/dev/fonts/local-font-preview";
import type { LocalPreviewRuntime } from "@/app/dev/fonts/use-local-font-previews";

export type FontPickerSlotName = "primary" | "secondary" | "mono";

export const FONT_LIST_PAGE_SIZE = 200;

export const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "local", label: "Uploaded" },
  { id: "sans-serif", label: "Sans-serif" },
  { id: "serif", label: "Serif" },
  { id: "monospace", label: "Mono" },
  { id: "display", label: "Display" },
  { id: "handwriting", label: "Handwriting" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export type PickerEntry = [string, BunnyFontMeta];

export const SLOT_DEFAULT_CATEGORY: Record<FontPickerSlotName, CategoryId> = {
  primary: "sans-serif",
  secondary: "serif",
  mono: "monospace",
};

export function localDisplayNameFromLibrary(localLibrary: LocalPreviewRuntime | undefined): string {
  const localNames = localLibrary?.files.map((f) => f.fileName) ?? [];
  return localNames.length > 0 ? deriveLocalDisplayFamily(localNames) : "Local";
}

export function buildLocalSyntheticPickerEntry(
  localLibrary: LocalPreviewRuntime | undefined,
  localDisplayName: string
): PickerEntry | null {
  if (!localLibrary?.files.length) return null;
  const weights = [
    ...new Set(localLibrary.files.map((f) => inferWeightStyleFromFileName(f.fileName).weight)),
  ].sort((a, b) => a - b);
  return [
    "__local__",
    {
      name: localDisplayName,
      weights,
      styles: ["normal", "italic"],
      variable: false,
      category: "local",
    },
  ];
}

export function validPickerEntries(fontList: Record<string, BunnyFontMeta>): PickerEntry[] {
  return Object.entries(fontList).filter(
    ([, meta]) => meta && typeof meta.name === "string" && meta.name.length > 0
  );
}

export function entriesForCategory(
  category: CategoryId,
  localSyntheticEntry: PickerEntry | null,
  allEntries: PickerEntry[]
): PickerEntry[] {
  if (category === "local") return localSyntheticEntry ? [localSyntheticEntry] : [];
  if (category === "all") return allEntries;
  return allEntries.filter(([, meta]) => meta.category === category);
}

export function filterEntriesBySearch(entries: PickerEntry[], search: string): PickerEntry[] {
  const normalized = search.trim().toLowerCase();
  if (normalized.length === 0) return entries;
  return entries.filter(([, meta]) => meta.name.toLowerCase().includes(normalized));
}

export function resetPickerPagination(
  listDisplayCountRef: MutableRefObject<number>,
  listScrollTopRef: MutableRefObject<number>,
  setDisplayCount: Dispatch<SetStateAction<number>>
): void {
  listDisplayCountRef.current = FONT_LIST_PAGE_SIZE;
  listScrollTopRef.current = 0;
  setDisplayCount(FONT_LIST_PAGE_SIZE);
}

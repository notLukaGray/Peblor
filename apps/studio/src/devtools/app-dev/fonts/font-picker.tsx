"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { BunnyFontMeta } from "@/app/dev/fonts/page";
import { previewCssFamily } from "@/app/dev/fonts/local-font-preview";
import type { LocalPreviewRuntime } from "@/app/dev/fonts/use-local-font-previews";
import { FontDropdownItem } from "./font-dropdown-item";
import {
  CATEGORIES,
  FONT_LIST_PAGE_SIZE,
  SLOT_DEFAULT_CATEGORY,
  buildLocalSyntheticPickerEntry,
  entriesForCategory,
  filterEntriesBySearch,
  localDisplayNameFromLibrary,
  resetPickerPagination,
  type CategoryId,
  type FontPickerSlotName,
  validPickerEntries,
} from "./font-picker-helpers";

export function FontPicker({
  slot,
  value,
  fontList,
  previewMode,
  localLibrary,
  onSelectCatalog,
  onSelectLocal,
  previewSampleText,
}: {
  slot: FontPickerSlotName;
  value: string;
  fontList: Record<string, BunnyFontMeta>;
  previewMode: "catalog" | "local";
  localLibrary?: LocalPreviewRuntime;
  onSelectCatalog: (family: string) => void;
  onSelectLocal: () => void;
  previewSampleText: string;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<CategoryId>(SLOT_DEFAULT_CATEGORY[slot]);
  const ref = useRef<HTMLDivElement>(null);
  const listUlRef = useRef<HTMLUListElement | null>(null);
  const [listScrollRoot, setListScrollRoot] = useState<HTMLUListElement | null>(null);
  const setListUlRef = useCallback((el: HTMLUListElement | null) => {
    listUlRef.current = el;
    setListScrollRoot(el);
  }, []);
  const [displayCount, setDisplayCount] = useState(FONT_LIST_PAGE_SIZE);
  const listScrollTopRef = useRef(0);
  const listDisplayCountRef = useRef(FONT_LIST_PAGE_SIZE);
  const listLoadSentinelRef = useRef<HTMLLIElement | null>(null);
  const visibleLengthRef = useRef(0);

  useEffect(() => {
    listDisplayCountRef.current = displayCount;
  }, [displayCount]);

  const localDisplayName = localDisplayNameFromLibrary(localLibrary);
  const localSyntheticEntry = buildLocalSyntheticPickerEntry(localLibrary, localDisplayName);
  const allEntries = validPickerEntries(fontList);
  const categoryFiltered = entriesForCategory(category, localSyntheticEntry, allEntries);
  const visible = filterEntriesBySearch(categoryFiltered, search);

  const shown = visible.slice(0, displayCount);
  const hasMore = visible.length > displayCount;

  useLayoutEffect(() => {
    visibleLengthRef.current = visible.length;
  }, [visible.length]);

  useLayoutEffect(() => {
    const ul = listUlRef.current;
    if (!open || !ul) return;
    ul.scrollTop = listScrollTopRef.current;
  }, [open, listScrollRoot, category, search]);

  useEffect(() => {
    if (!open || !hasMore) return;
    const root = listUlRef.current;
    const target = listLoadSentinelRef.current;
    if (!root || !target) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setDisplayCount((c) => {
          const cap = visibleLengthRef.current;
          if (c >= cap) return c;
          const next = Math.min(c + FONT_LIST_PAGE_SIZE, cap);
          listDisplayCountRef.current = next;
          return next;
        });
      },
      { root, rootMargin: "0px 0px 120px 0px", threshold: 0 }
    );
    obs.observe(target);
    return () => obs.disconnect();
  }, [open, hasMore, displayCount, listScrollRoot]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="w-full rounded border border-border bg-background px-3 py-1.5 text-left text-sm font-mono text-foreground hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring flex items-center justify-between gap-2"
        onClick={() => {
          let nextOpen = false;
          setOpen((o) => {
            nextOpen = !o;
            return nextOpen;
          });
          if (nextOpen) {
            setDisplayCount(listDisplayCountRef.current);
            if (previewMode === "local" && localLibrary && localLibrary.files.length > 0) {
              setCategory("local");
            }
          }
        }}
      >
        <span>{value}</span>
        <span className="text-muted-foreground text-[10px]">▾</span>
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full rounded border border-border bg-background shadow-xl">
          <div className="flex gap-0 border-b border-border overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setCategory(cat.id);
                  resetPickerPagination(listDisplayCountRef, listScrollTopRef, setDisplayCount);
                }}
                className={`shrink-0 px-2.5 py-1.5 text-[11px] font-mono whitespace-nowrap transition-colors ${
                  category === cat.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="border-b border-border px-2 py-1.5">
            <input
              autoFocus
              className="w-full bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
              placeholder="Search…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPickerPagination(listDisplayCountRef, listScrollTopRef, setDisplayCount);
              }}
            />
          </div>

          <ul
            ref={setListUlRef}
            onScroll={(e) => {
              listScrollTopRef.current = e.currentTarget.scrollTop;
            }}
            className="max-h-72 overflow-y-auto overflow-x-hidden"
          >
            {shown.map(([slug, meta]) => (
              <li key={slug} className="border-b border-border/40 last:border-0">
                <FontDropdownItem
                  slug={slug}
                  meta={meta}
                  sampleLine={previewSampleText}
                  scrollRoot={listScrollRoot}
                  devLocalFace={
                    slug === "__local__"
                      ? {
                          cssFamily: previewCssFamily(slot),
                          weights: meta.weights,
                          variable: false,
                          fileCount: localLibrary?.files.length ?? 0,
                        }
                      : undefined
                  }
                  onSelect={() => {
                    if (slug === "__local__") onSelectLocal();
                    else onSelectCatalog(meta.name);
                    setOpen(false);
                    setSearch("");
                    resetPickerPagination(listDisplayCountRef, listScrollTopRef, setDisplayCount);
                  }}
                />
              </li>
            ))}
            {hasMore ? (
              <li
                ref={listLoadSentinelRef}
                className="h-px w-full shrink-0 overflow-hidden border-0 p-0 pointer-events-none list-none"
                aria-hidden
              />
            ) : null}
            {visible.length === 0 ? (
              <li className="px-3 py-3 text-[11px] text-muted-foreground font-mono">
                {category === "local"
                  ? "No files yet — upload under Your files below."
                  : "No fonts match your search"}
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

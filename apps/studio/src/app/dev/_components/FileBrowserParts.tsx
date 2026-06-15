"use client";

import type { DirEntry } from "./FileBrowser";

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function joinPath(base: string, name: string): string {
  return base === "/" ? `/${name}` : `${base}/${name}`;
}

export function baseName(filePath: string): string {
  const trimmed = filePath.replace(/\/+$/, "");
  const idx = trimmed.lastIndexOf("/");
  return idx === -1 ? trimmed : trimmed.slice(idx + 1);
}

const ROW_BASE =
  "flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-[12px] transition-colors";

function entryRowClass(isSelected: boolean, selectable: boolean): string {
  if (isSelected) return `${ROW_BASE} bg-foreground/10 text-foreground`;
  if (selectable) return `${ROW_BASE} text-muted-foreground hover:bg-muted hover:text-foreground`;
  return `${ROW_BASE} cursor-default text-muted-foreground/40`;
}

type EntryRowProps = {
  entry: DirEntry;
  mode: "file" | "folder";
  isSelected: boolean;
  onSelect: (name: string, isDirectory: boolean) => void;
};

export function EntryRow({ entry, mode, isSelected, onSelect }: EntryRowProps) {
  const selectable = mode === "file" ? entry.isFile : entry.isDirectory;

  return (
    <button
      type="button"
      onClick={() => onSelect(entry.name, entry.isDirectory)}
      disabled={!selectable && mode === "folder"}
      className={entryRowClass(isSelected, selectable)}
    >
      <span className="text-[13px]">{entry.isDirectory ? "\u{1F4C1}" : "\u{1F4C4}"}</span>
      <span className="min-w-0 truncate">{entry.name}</span>
      {entry.isFile && (
        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/50">
          {humanSize(entry.size)}
        </span>
      )}
    </button>
  );
}

type EntryListProps = {
  entries: DirEntry[];
  mode: "file" | "folder";
  selectedName: string | null;
  onSelect: (name: string, isDirectory: boolean) => void;
};

export function FileEntryList({ entries, mode, selectedName, onSelect }: EntryListProps) {
  if (entries.length === 0) {
    return (
      <div className="px-3 py-8 text-center font-mono text-[11px] text-muted-foreground">
        Empty directory
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {entries.map((entry) => (
        <EntryRow
          key={entry.name}
          entry={entry}
          mode={mode}
          isSelected={mode === "file" && entry.name === selectedName}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

type BreadcrumbNavProps = {
  currentPath: string;
  onNavigate: (path: string) => void;
};

export function BreadcrumbNav({ currentPath, onNavigate }: BreadcrumbNavProps) {
  const parts = currentPath.split("/").filter(Boolean);
  const crumbs: { label: string; path: string }[] = [{ label: "/", path: "/" }];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    crumbs.push({ label: part, path: "/" + parts.slice(0, i + 1).join("/") });
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 font-mono text-[10px] text-muted-foreground">
      {crumbs.map((crumb, i) => (
        <span key={crumb.path} className="inline-flex items-center gap-0.5">
          {i > 0 && <span className="text-muted-foreground/40">/</span>}
          <button
            type="button"
            onClick={() => onNavigate(crumb.path)}
            className="rounded px-1 py-0.5 transition-colors hover:bg-muted hover:text-foreground"
          >
            {crumb.label}
          </button>
        </span>
      ))}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { baseName, BreadcrumbNav, FileEntryList, joinPath } from "./FileBrowserParts";

export type DirEntry = {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
};

type BrowseResult = {
  path: string;
  entries: DirEntry[];
  parent: string | null;
};

function useBrowse() {
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [parent, setParent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roots, setRoots] = useState<string[]>([]);

  const browse = useCallback(async (dirPath: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ dir: dirPath });
      const response = await fetch(`/api/dev/local-browse?${params.toString()}`);
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || `Failed to read directory (${response.status})`);
      }
      const data = (await response.json()) as BrowseResult;
      setCurrentPath(data.path);
      setEntries(data.entries);
      setParent(data.parent);
    } catch (err) {
      setError((err as Error).message || "Browse failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const response = await fetch("/api/dev/local-browse");
        if (!response.ok) throw new Error("Failed to load roots");
        const data = (await response.json()) as { roots: string[] };
        setRoots(data.roots);
      } catch (err) {
        setError((err as Error).message || "Browse failed.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  return { currentPath, entries, parent, loading, error, roots, browse };
}

function confirmLabel(
  mode: "file" | "folder",
  selectedName: string | null,
  currentPath: string | null
): string {
  if (mode === "file") {
    return selectedName ? `Select "${selectedName}"` : "Pick a file";
  }
  return currentPath ? `Select "${baseName(currentPath)}"` : "Pick a folder";
}

type BrowseContentProps = {
  loading: boolean;
  error: string;
  currentPath: string | null;
  entries: DirEntry[];
  mode: "file" | "folder";
  selectedName: string | null;
  onEntrySelect: (name: string, isDirectory: boolean) => void;
};

function BrowseContent({
  loading,
  error,
  currentPath,
  entries,
  mode,
  selectedName,
  onEntrySelect,
}: BrowseContentProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 font-mono text-[11px] text-muted-foreground">
        Reading directory...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-[11px] text-red-400">
        {error}
      </div>
    );
  }

  if (currentPath) {
    return (
      <div className="max-h-64 overflow-auto rounded border border-border">
        <FileEntryList
          entries={entries}
          mode={mode}
          selectedName={selectedName}
          onSelect={onEntrySelect}
        />
      </div>
    );
  }

  return null;
}

type FileBrowserProps = {
  mode: "file" | "folder";
  onSelect: (absolutePath: string) => void;
  onCancel: () => void;
};

export function FileBrowser({ mode, onSelect, onCancel }: FileBrowserProps) {
  const { currentPath, entries, parent, loading, error, roots, browse } = useBrowse();
  const [selectedName, setSelectedName] = useState<string | null>(null);

  function handleEntrySelect(name: string, isDirectory: boolean) {
    if (isDirectory) {
      setSelectedName(null);
      browse(joinPath(currentPath ?? "/", name));
    } else if (mode === "file") {
      setSelectedName(name);
    }
  }

  function confirmSelection() {
    if (mode === "folder" && currentPath) {
      onSelect(currentPath);
      return;
    }
    if (mode === "file" && selectedName && currentPath) {
      onSelect(joinPath(currentPath, selectedName));
    }
  }

  const canConfirm = mode === "folder" ? currentPath !== null : selectedName !== null;

  const showRoots = !currentPath && roots.length > 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Browse {mode === "file" ? "file" : "folder"}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {"✕"}
        </button>
      </div>

      {showRoots && (
        <div className="flex flex-wrap gap-1.5">
          {roots.map((root) => (
            <button
              key={root}
              type="button"
              onClick={() => browse(root)}
              className="rounded border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {root === "/" ? "/ (root)" : baseName(root) || root}
            </button>
          ))}
        </div>
      )}

      {currentPath && <BreadcrumbNav currentPath={currentPath} onNavigate={browse} />}

      {parent && (
        <button
          type="button"
          onClick={() => browse(parent)}
          className="inline-flex items-center gap-1.5 self-start rounded border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <span>{"↑"}</span>
          <span>Parent ({baseName(parent)})</span>
        </button>
      )}

      <BrowseContent
        loading={loading}
        error={error}
        currentPath={currentPath}
        entries={entries}
        mode={mode}
        selectedName={selectedName}
        onEntrySelect={handleEntrySelect}
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={confirmSelection}
          disabled={!canConfirm}
          className="rounded border border-foreground/30 bg-foreground px-4 py-2 text-[12px] font-mono text-background transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {confirmLabel(mode, selectedName, currentPath)}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-border px-4 py-2 text-[12px] font-mono text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

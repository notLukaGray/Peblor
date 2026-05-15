"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
} from "react";
import { confirmAndClearAllDevToolStorage } from "@/app/dev/_components/dev-reset";
import { useWorkbenchSnapshotControls } from "@/app/dev/_components/use-workbench-snapshot-controls";
import {
  exportSession,
  type Flash,
  handleImportFileChange,
  importProductionDefaults,
} from "@/app/dev/_components/dev-workbench-session-drawer-actions";

type Props = {
  onResetSection?: () => void;
  onTotalReset?: () => void;
};

const btnBase =
  "inline-flex items-center rounded border px-2.5 py-1.5 text-[11px] font-mono transition-colors border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40";
const btnDestructive =
  "inline-flex items-center rounded border border-destructive/40 px-2.5 py-1.5 text-[11px] font-mono text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40";

function subscribeToSnapshotCount() {
  return () => {};
}

// eslint-disable-next-line complexity
export function DevWorkbenchSessionDrawer({ onResetSection, onTotalReset }: Props) {
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState<Flash>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFlash = useCallback((next: Flash) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlash(next);
    if (next) flashTimerRef.current = setTimeout(() => setFlash(null), 4500);
  }, []);

  const {
    snapshots,
    selectedSnapshotId,
    setSelectedSnapshotId,
    snapshotName,
    setSnapshotName,
    snapshotDiffKeys,
    onSaveSnapshot,
    onLoadSnapshot,
    onDeleteSnapshot,
  } = useWorkbenchSnapshotControls({ showFlash });

  const snapshotCount = useSyncExternalStore(
    subscribeToSnapshotCount,
    () => snapshots.length,
    () => 0
  );

  // Close panel on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(
    () => () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    },
    []
  );

  const onExport = useCallback(() => exportSession(showFlash), [showFlash]);
  const onPickImport = useCallback(() => importRef.current?.click(), []);
  const onImportProduction = useCallback(() => importProductionDefaults(showFlash), [showFlash]);
  const onImportFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => handleImportFileChange(event, showFlash),
    [showFlash]
  );
  const onResetAll = useCallback(() => {
    if (!confirmAndClearAllDevToolStorage()) return;
    setOpen(false);
    onTotalReset?.();
  }, [onTotalReset]);

  const diffText =
    selectedSnapshotId && snapshotDiffKeys.length === 0
      ? "Matches current session"
      : selectedSnapshotId
        ? `Diff: ${snapshotDiffKeys.join(", ")}`
        : null;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button — never changes height */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-[11px] font-mono text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        Session
        {snapshotCount > 0 ? (
          <span className="rounded-full bg-muted px-1.5 py-px text-[10px] leading-none">
            {snapshotCount}
          </span>
        ) : null}
      </button>

      {/* Floating panel — absolutely positioned, does not affect nav height */}
      {open ? (
        <div
          role="dialog"
          aria-label="Session management"
          className="absolute right-0 top-full z-50 mt-1.5 w-80 space-y-3 rounded-lg border border-border bg-popover p-3 shadow-lg"
        >
          {/* Snapshots */}
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground/60">
              Snapshots
            </p>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                placeholder="Slot name"
                aria-label="Snapshot slot name"
                className="h-7 min-w-0 flex-1 rounded border border-border bg-background px-2 text-[11px] font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <select
                value={selectedSnapshotId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedSnapshotId(id);
                  const found = snapshots.find((s) => s.id === id);
                  if (found) setSnapshotName(found.name);
                }}
                aria-label="Saved snapshots"
                className="h-7 max-w-[9rem] rounded border border-border bg-background px-1.5 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">— slots —</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.scope !== "all" ? ` [${s.scope}]` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={onSaveSnapshot} className={btnBase}>
                Save
              </button>
              <button
                type="button"
                onClick={onLoadSnapshot}
                disabled={!selectedSnapshotId}
                className={btnBase}
              >
                Load
              </button>
              <button
                type="button"
                onClick={onDeleteSnapshot}
                disabled={!selectedSnapshotId}
                className={btnBase}
              >
                Delete
              </button>
            </div>
            {diffText ? (
              <p className="text-[10px] font-mono text-muted-foreground/70">{diffText}</p>
            ) : null}
          </div>

          {/* Import / Export */}
          <div className="space-y-1.5 border-t border-border/50 pt-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground/60">
              Import / Export
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={onExport} className={btnBase}>
                Export
              </button>
              <button type="button" onClick={onPickImport} className={btnBase}>
                Import
              </button>
              <button type="button" onClick={onImportProduction} className={btnBase}>
                Prod defaults
              </button>
            </div>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              tabIndex={-1}
              onChange={onImportFile}
              aria-hidden
            />
          </div>

          {/* Reset */}
          <div className="flex flex-wrap gap-1.5 border-t border-border/50 pt-2.5">
            <button
              type="button"
              onClick={onResetSection}
              disabled={!onResetSection}
              className={btnBase}
            >
              Reset section
            </button>
            <button type="button" onClick={onResetAll} className={btnDestructive}>
              Total reset
            </button>
          </div>

          {/* Flash */}
          {flash ? (
            <p
              role="status"
              className={`text-[11px] font-mono leading-snug ${
                flash.kind === "error" ? "text-destructive" : "text-emerald-400"
              }`}
            >
              {flash.text}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

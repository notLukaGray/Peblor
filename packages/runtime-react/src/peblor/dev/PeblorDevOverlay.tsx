"use client";

import { useEffect, useState } from "react";
import {
  useVariableStore,
  useActionLogStore,
  useMutationLogStore,
  type MutationLogEntry,
} from "@/peblor/runtime/peblor-variable-store";
import { useFigmaExportDiagnosticsStore } from "@/peblor/dev/figma-export-diagnostics-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

function truncate(str: string, max = 80): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function actionTypeColor(type: string): string {
  if (type.startsWith("three.")) return "text-blue-400";
  if (type.startsWith("rive.")) return "text-purple-400";
  return "text-green-400";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function VariablesTab() {
  const variables = useVariableStore((s) => s.variables);
  const entries = Object.entries(variables);

  if (entries.length === 0) {
    return <p className="text-gray-500 text-xs px-3 py-4 font-mono">No variables set.</p>;
  }

  return (
    <div className="overflow-y-auto max-h-72">
      <table className="w-full text-xs font-mono">
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-b border-gray-800">
              <td className="px-3 py-1.5 text-gray-300 w-1/3 align-top break-all">{key}</td>
              <td className="px-3 py-1.5 text-yellow-300 align-top break-all">
                {truncate(JSON.stringify(value))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FigmaTab() {
  const embedded = useFigmaExportDiagnosticsStore((s) => s.embedded);
  const scanned = useFigmaExportDiagnosticsStore((s) => s.scannedFallback);

  if (!embedded && (!scanned || scanned.fallbackElements === 0)) {
    return (
      <p className="text-gray-500 text-xs px-3 py-4 font-mono leading-relaxed">
        No Figma export diagnostics yet. Use the Figma plugin &quot;Copy page JSON&quot; (includes{" "}
        <span className="text-gray-400">figmaExportDiagnostics</span>) and paste into the{" "}
        <span className="text-gray-400">/playground</span> page — or open a page JSON that already
        embeds the field.
      </p>
    );
  }

  return (
    <div className="overflow-y-auto max-h-72 px-3 py-2 text-xs font-mono space-y-3">
      {embedded ? (
        <div className="space-y-1 border-b border-gray-800 pb-2">
          <div className="text-gray-500 uppercase tracking-wide text-[10px]">
            Exporter trace (embedded)
          </div>
          <div className="text-gray-200">
            <span className="text-green-400">{embedded.converted}</span> converted ·{" "}
            <span className="text-amber-400">{embedded.fallback}</span> fallback ·{" "}
            <span className="text-red-400">{embedded.dropped}</span> dropped
          </div>
          {embedded.topFallbackReasons.length > 0 && (
            <div>
              <div className="text-gray-500 mt-1">Top fallback reasons</div>
              <ul className="text-gray-400 mt-0.5 space-y-0.5">
                {embedded.topFallbackReasons.map((r) => (
                  <li key={r.code}>
                    <span className="text-amber-300/90">{r.code}</span> × {r.count}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {embedded.highRiskWarnings && embedded.highRiskWarnings.length > 0 && (
            <div>
              <div className="text-gray-500 mt-1">High-risk warnings (category)</div>
              <ul className="text-gray-400 mt-0.5 space-y-0.5">
                {embedded.highRiskWarnings.map((w) => (
                  <li key={w.category}>
                    <span className="text-orange-300/90">{w.category}</span> × {w.count}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
      {scanned && scanned.fallbackElements > 0 ? (
        <div className="space-y-1">
          <div className="text-gray-500 uppercase tracking-wide text-[10px]">
            Scanned from JSON (fallback only)
          </div>
          <div className="text-gray-300">
            <span className="text-amber-400">{scanned.fallbackElements}</span> elements with{" "}
            <span className="text-gray-500">meta.figma.fallbackReason</span>
          </div>
          <ul className="text-gray-400 space-y-0.5">
            {scanned.topFallbackReasons.map((r) => (
              <li key={r.code}>
                <span className="text-amber-300/90">{r.code}</span> × {r.count}
              </li>
            ))}
          </ul>
          {!embedded ? (
            <p className="text-gray-600 text-[10px] mt-1 leading-snug">
              Dropped / converted counts need embedded{" "}
              <span className="text-gray-500">figmaExportDiagnostics</span> from the plugin.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ActionsTab() {
  const entries = useActionLogStore((s) => s.entries);
  const clear = useActionLogStore((s) => s.clear);

  return (
    <>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800">
        <span className="text-gray-500 text-xs font-mono">
          {entries.length} action{entries.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={clear}
          className="text-xs text-gray-400 hover:text-gray-100 font-mono px-2 py-0.5 rounded border border-gray-700 hover:border-gray-500 transition-colors"
        >
          Clear
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="text-gray-500 text-xs px-3 py-4 font-mono">No actions fired yet.</p>
      ) : (
        <div className="overflow-y-auto max-h-64">
          <table className="w-full text-xs font-mono">
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-800">
                  <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap align-top">
                    {formatTimestamp(entry.timestamp)}
                  </td>
                  <td
                    className={`px-2 py-1.5 whitespace-nowrap align-top ${actionTypeColor(entry.type)}`}
                  >
                    {entry.type}
                  </td>
                  <td className="px-2 py-1.5 text-gray-400 align-top break-all">
                    {truncate(JSON.stringify(entry.payload ?? null))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function MutationsTab() {
  const entries = useMutationLogStore((s) => s.entries);
  const clear = useMutationLogStore((s) => s.clear);

  return (
    <>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800">
        <span className="text-gray-500 text-xs font-mono">
          {entries.length} mutation{entries.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={clear}
          className="text-xs text-gray-400 hover:text-gray-100 font-mono px-2 py-0.5 rounded border border-gray-700 hover:border-gray-500 transition-colors"
        >
          Clear
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="text-gray-500 text-xs px-3 py-4 font-mono">No mutations yet.</p>
      ) : (
        <div className="overflow-y-auto max-h-64">
          <table className="w-full text-xs font-mono">
            <tbody>
              {entries.map((entry: MutationLogEntry) => (
                <tr key={entry.id} className="border-b border-gray-800">
                  <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap align-top">
                    {formatTimestamp(entry.timestamp)}
                  </td>
                  <td className="px-2 py-1.5 text-yellow-400 whitespace-nowrap align-top">
                    {entry.key}
                  </td>
                  <td className="px-2 py-1.5 text-gray-400 align-top break-all">
                    {truncate(JSON.stringify(entry.from ?? null))}
                    <span className="text-gray-600 mx-1">→</span>
                    <span className="text-green-400">
                      {truncate(JSON.stringify(entry.to ?? null))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main overlay
// ---------------------------------------------------------------------------

type Tab = "variables" | "actions" | "mutations" | "figma";

export function PeblorDevOverlay() {
  const isDev = process.env.NODE_ENV === "development";

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("variables");

  useEffect(() => {
    if (!isDev) return;
    function handleKey(e: KeyboardEvent) {
      if (e.shiftKey && (e.ctrlKey || e.metaKey) && e.key === "D") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isDev]);

  if (!isDev || !open) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[var(--pb-z-max)] w-[420px] max-w-[calc(100vw-2rem)] bg-gray-900 text-gray-100 rounded-lg shadow-2xl border border-gray-700 flex flex-col overflow-hidden"
      style={{ fontFamily: "monospace" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-xs font-semibold text-gray-300 tracking-wide uppercase">PB Dev</span>
        <div className="flex items-center gap-1">
          {(["variables", "actions", "mutations", "figma"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs px-2 py-0.5 rounded transition-colors ${
                tab === t ? "bg-gray-600 text-gray-100" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {t === "figma" ? "Figma" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          <button
            onClick={() => setOpen(false)}
            className="ml-2 text-gray-500 hover:text-gray-200 text-sm leading-none px-1"
            aria-label="Close overlay"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tab content */}
      {tab === "variables" ? (
        <VariablesTab />
      ) : tab === "actions" ? (
        <ActionsTab />
      ) : tab === "mutations" ? (
        <MutationsTab />
      ) : (
        <FigmaTab />
      )}

      {/* Footer hint */}
      <div className="px-3 py-1 bg-gray-800 border-t border-gray-700">
        <span className="text-gray-600 text-xs">⌘⇧D to toggle</span>
      </div>
    </div>
  );
}

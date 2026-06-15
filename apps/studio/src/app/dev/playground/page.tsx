"use client";

import { notFound } from "next/navigation";
import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  Component,
  type CSSProperties,
  type ErrorInfo,
  type ReactNode,
  type UIEvent,
} from "react";
import type { SectionBlock, bgBlock } from "@pb/contracts";
import { sectionBlockSchema, type Peblor } from "@pb/contracts";
import { expandPeblor } from "@pb/core/expand";
import { ServerBreakpointProvider } from "@pb/runtime-react/core/providers/device-type-provider";
import { PeblorRenderer } from "@pb/runtime-react/renderers";
import { ScrollContainerProvider } from "@pb/runtime-react/scroll";
import { z } from "zod";
import { useFigmaExportDiagnosticsStore } from "@pb/runtime-react/dev-client";
import { getPbPreviewScopeCssVars, type PbPreviewColorScheme } from "@/app/theme/config";
import { resolveBreakpointClient } from "./breakpoint-resolver";
import { normaliseInput } from "./input-normaliser";

// ---------------------------------------------------------------------------
// Zod validation — only validates the sections array structure
// ---------------------------------------------------------------------------

const sectionsSchema = z.array(sectionBlockSchema);

type ValidationResult =
  | { valid: true }
  | { valid: false; issues: { path: string; message: string }[] };

function validateSections(sections: SectionBlock[]): ValidationResult {
  const result = sectionsSchema.safeParse(sections);
  if (result.success) return { valid: true };
  return {
    valid: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.join(".") || "(root)",
      message: issue.message,
    })),
  };
}

function isPeblorDocument(raw: unknown): raw is Peblor {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  return (
    Array.isArray(o.sectionOrder) && o.definitions != null && typeof o.definitions === "object"
  );
}

const BG_TYPES = new Set([
  "backgroundVideo",
  "backgroundImage",
  "backgroundVariable",
  "backgroundPattern",
  "backgroundTransition",
]);

function isBgBlockLike(value: unknown): value is bgBlock {
  return (
    value != null &&
    typeof value === "object" &&
    "type" in value &&
    BG_TYPES.has((value as { type: string }).type)
  );
}

function extractBgDefinitionsFromPage(page: Peblor): Record<string, bgBlock> {
  const out: Record<string, bgBlock> = {};
  for (const [key, block] of Object.entries(page.definitions ?? {})) {
    if (isBgBlockLike(block)) out[key] = block;
  }
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getSinglePeblorDocumentFromWrapper(raw: unknown): Peblor | null {
  if (!isRecord(raw)) return null;

  if (isRecord(raw.payload)) {
    const nested = getSinglePeblorDocumentFromWrapper(raw.payload);
    if (nested) return nested;
  }

  if (!isRecord(raw.pages)) return null;
  const pageCandidates = Object.values(raw.pages).filter((page): page is Peblor =>
    isPeblorDocument(page)
  );
  if (pageCandidates.length !== 1) return null;
  return pageCandidates[0] ?? null;
}

// ---------------------------------------------------------------------------
// ErrorBoundary for the preview panel
// ---------------------------------------------------------------------------

type ErrorBoundaryState = { hasError: boolean; errorMessage: string };

class PreviewErrorBoundary extends Component<
  { children: ReactNode; onError: (msg: string) => void },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; onError: (msg: string) => void }) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    this.props.onError(error.message);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex items-start gap-2 rounded border border-red-500/30 bg-red-950/40 p-4 text-sm font-mono text-red-300">
          <span className="shrink-0 text-red-400">Runtime error:</span>
          <span className="break-all">{this.state.errorMessage}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Debounce hook
// ---------------------------------------------------------------------------

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ---------------------------------------------------------------------------
// Placeholder JSON
// ---------------------------------------------------------------------------

const PLACEHOLDER = `{
  "sections": [
    {
      "type": "contentBlock",
      "id": "my-section",
      "elements": []
    }
  ]
}`;

// ---------------------------------------------------------------------------
// Main playground component
// ---------------------------------------------------------------------------

type ParsedState =
  | { status: "empty" }
  | { status: "json-error"; message: string }
  | { status: "normalise-error"; message: string }
  | {
      status: "ok";
      sections: SectionBlock[];
      validationIssues: { path: string; message: string }[];
      resolvedBg: bgBlock | null;
      bgDefinitions: Record<string, bgBlock>;
    };

type PreviewSurfaceVar = "--pb-surface-root" | "--pb-surface-muted" | "--pb-surface-raised";

type PreviewBackground =
  | { label: string; mode: "native" }
  | { label: string; mode: "token"; cssVar: PreviewSurfaceVar };

const PREVIEW_BACKGROUNDS: readonly PreviewBackground[] = [
  { label: "native", mode: "native" },
  { label: "canvas", mode: "token", cssVar: "--pb-surface-root" },
  { label: "muted", mode: "token", cssVar: "--pb-surface-muted" },
  { label: "raised", mode: "token", cssVar: "--pb-surface-raised" },
] as const;

export default function PlaygroundPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const [jsonText, setJsonText] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [previewScheme, setPreviewScheme] = useState<PbPreviewColorScheme>("light");
  const [previewBgIndex, setPreviewBgIndex] = useState(0);
  const [errorPanelOpen, setErrorPanelOpen] = useState(true);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLPreElement>(null);
  const previewViewportRef = useRef<HTMLDivElement | null>(null);

  const debouncedText = useDebounced(jsonText, 300);
  const lineCount = useMemo(() => Math.max(1, jsonText.split("\n").length), [jsonText]);
  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, index) => String(index + 1)).join("\n"),
    [lineCount]
  );

  useEffect(() => {
    if (debouncedText.trim() === "") {
      useFigmaExportDiagnosticsStore.getState().ingestPlaygroundPageRoot(null);
      return;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(debouncedText.trim());
    } catch (err) {
      console.warn("[studio] Failed to parse playground JSON input", err);
      useFigmaExportDiagnosticsStore.getState().ingestPlaygroundPageRoot(null);
      return;
    }
    if (isPeblorDocument(raw)) {
      useFigmaExportDiagnosticsStore.getState().ingestPlaygroundPageRoot(raw);
    } else {
      useFigmaExportDiagnosticsStore.getState().ingestPlaygroundPageRoot(null);
    }
  }, [debouncedText]);

  const parsed = useMemo((): ParsedState => {
    const trimmed = debouncedText.trim();
    if (!trimmed) return { status: "empty" };

    let raw: unknown;
    try {
      raw = JSON.parse(trimmed);
    } catch (e) {
      return {
        status: "json-error",
        message: e instanceof Error ? e.message : String(e),
      };
    }

    if (isPeblorDocument(raw)) {
      try {
        const { bg, sections: expanded } = expandPeblor(raw);
        const validation = validateSections(expanded);
        return {
          status: "ok",
          sections: expanded,
          validationIssues: validation.valid ? [] : validation.issues,
          resolvedBg: bg,
          bgDefinitions: extractBgDefinitionsFromPage(raw),
        };
      } catch (e) {
        return {
          status: "normalise-error",
          message: e instanceof Error ? e.message : String(e),
        };
      }
    }

    const wrappedPage = getSinglePeblorDocumentFromWrapper(raw);
    if (wrappedPage) {
      try {
        const { bg, sections: expanded } = expandPeblor(wrappedPage);
        const validation = validateSections(expanded);
        return {
          status: "ok",
          sections: expanded,
          validationIssues: validation.valid ? [] : validation.issues,
          resolvedBg: bg,
          bgDefinitions: extractBgDefinitionsFromPage(wrappedPage),
        };
      } catch (e) {
        return {
          status: "normalise-error",
          message: e instanceof Error ? e.message : String(e),
        };
      }
    }

    const normalised = normaliseInput(raw);
    if (!normalised.ok) {
      return { status: "normalise-error", message: normalised.error };
    }

    const validation = validateSections(normalised.sections);
    return {
      status: "ok",
      sections: normalised.sections,
      validationIssues: validation.valid ? [] : validation.issues,
      resolvedBg: null,
      bgDefinitions: {},
    };
  }, [debouncedText]);

  const resolvedSections = useMemo((): SectionBlock[] => {
    if (parsed.status !== "ok") return [];
    return resolveBreakpointClient(parsed.sections, isMobile);
  }, [parsed, isMobile]);

  const previewBackground: PreviewBackground =
    PREVIEW_BACKGROUNDS[previewBgIndex] ?? PREVIEW_BACKGROUNDS[0]!;
  const previewSurfaceStyle = useMemo((): CSSProperties => {
    const vars = getPbPreviewScopeCssVars(previewScheme);
    const style: CSSProperties = { ...vars, minHeight: "100%" };
    if (previewBackground.mode === "token") {
      style.backgroundColor = `var(${previewBackground.cssVar})`;
    }
    return style;
  }, [previewScheme, previewBackground]);
  const previewResetKey = `${isMobile ? "mobile" : "desktop"}:${previewScheme}:${debouncedText}`;

  const handleRuntimeError = useCallback((msg: string) => {
    setRuntimeError(msg);
  }, []);
  const handleEditorScroll = useCallback((event: UIEvent<HTMLTextAreaElement>) => {
    if (!lineNumbersRef.current) return;
    lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop;
  }, []);

  // Error panel — collect all errors to display
  const allErrors = useMemo(() => {
    const errs: string[] = [];
    if (parsed.status === "json-error") errs.push(`JSON parse error: ${parsed.message}`);
    if (parsed.status === "normalise-error") errs.push(`Input error: ${parsed.message}`);
    if (parsed.status === "ok" && parsed.validationIssues.length > 0) {
      for (const issue of parsed.validationIssues) {
        errs.push(`Schema: ${issue.path} — ${issue.message}`);
      }
    }
    if (runtimeError) errs.push(`Runtime: ${runtimeError}`);
    return errs;
  }, [parsed, runtimeError]);

  const hasErrors = allErrors.length > 0;

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden bg-neutral-950 text-neutral-100">
      {}
      <header className="flex shrink-0 items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-neutral-700 px-1.5 py-0.5 font-mono text-[11px] text-neutral-400">
            pb
          </span>
          <span className="text-sm font-medium text-neutral-200">playground</span>
        </div>
        <div className="flex items-center gap-2">
          {hasErrors && (
            <button
              onClick={() => setErrorPanelOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded border border-red-700/60 bg-red-950/50 px-2.5 py-1 text-xs text-red-300 transition-opacity hover:opacity-80"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
              {allErrors.length} error{allErrors.length !== 1 ? "s" : ""}
              <span className="text-red-500">{errorPanelOpen ? "▲" : "▼"}</span>
            </button>
          )}
          {!hasErrors && parsed.status === "ok" && (
            <span className="rounded border border-green-800/60 bg-green-950/40 px-2.5 py-1 text-xs text-green-400">
              valid
            </span>
          )}
        </div>
      </header>

      {}
      {hasErrors && errorPanelOpen && (
        <div className="shrink-0 border-b border-red-900/40 bg-red-950/20 px-4 py-2">
          <ul className="space-y-0.5">
            {allErrors.map((err, i) => (
              <li key={i} className="font-mono text-[11px] text-red-300">
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {}
      <div className="flex min-h-0 flex-1">
        {}
        <div className="flex w-1/2 flex-col border-r border-neutral-800">
          <div className="shrink-0 border-b border-neutral-800 px-3 py-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-widest text-neutral-500">
                JSON input
              </span>
              {jsonText && (
                <button
                  onClick={() => {
                    setRuntimeError(null);
                    setJsonText("");
                  }}
                  className="text-[11px] text-neutral-500 hover:text-neutral-300"
                >
                  clear
                </button>
              )}
            </div>
            <p className="mt-1 text-[10px] leading-snug text-neutral-600">
              Documents with <code className="text-neutral-500">sectionOrder</code> +{" "}
              <code className="text-neutral-500">definitions</code> run through{" "}
              <code className="text-neutral-500">expandPeblor</code> (namespaced ids). No{" "}
              <code className="text-neutral-500">globals.json</code> merge or split section
              files—paste merged JSON or validate on-disk pages separately.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded border border-neutral-700 text-xs">
                <button
                  onClick={() => {
                    setRuntimeError(null);
                    setIsMobile(true);
                  }}
                  className={`px-2.5 py-1 transition-colors ${
                    isMobile
                      ? "bg-neutral-600 text-white"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  mobile
                </button>
                <button
                  onClick={() => {
                    setRuntimeError(null);
                    setIsMobile(false);
                  }}
                  className={`px-2.5 py-1 transition-colors ${
                    !isMobile
                      ? "bg-neutral-600 text-white"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  desktop
                </button>
              </div>
              <div className="flex items-center rounded border border-neutral-700 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setRuntimeError(null);
                    setPreviewScheme("light");
                  }}
                  className={`px-2.5 py-1 transition-colors ${
                    previewScheme === "light"
                      ? "bg-neutral-600 text-white"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  light
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRuntimeError(null);
                    setPreviewScheme("dark");
                  }}
                  className={`px-2.5 py-1 transition-colors ${
                    previewScheme === "dark"
                      ? "bg-neutral-600 text-white"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  dark
                </button>
              </div>
              <button
                onClick={() =>
                  setPreviewBgIndex((index) => (index + 1) % PREVIEW_BACKGROUNDS.length)
                }
                className="rounded border border-neutral-700 px-2.5 py-1 text-xs text-neutral-300 transition-colors hover:bg-neutral-800"
                title="Cycle preview background"
              >
                bg: {previewBackground.label}
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 bg-neutral-950 overflow-hidden">
            <div className="flex h-full">
              <pre
                ref={lineNumbersRef}
                aria-hidden
                className="w-12 shrink-0 overflow-hidden border-r border-neutral-800 bg-neutral-900 px-2 py-4 text-right font-mono text-xs leading-relaxed text-neutral-600 select-none"
              >
                {lineNumbers}
              </pre>
              <textarea
                ref={textareaRef}
                value={jsonText}
                onChange={(e) => {
                  setRuntimeError(null);
                  setJsonText(e.target.value);
                }}
                onScroll={handleEditorScroll}
                placeholder={PLACEHOLDER}
                spellCheck={false}
                className="min-h-0 flex-1 resize-none bg-neutral-950 px-3 py-4 font-mono text-xs leading-relaxed text-neutral-200 placeholder:text-neutral-700 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {}
        <div className="flex min-h-0 w-1/2 flex-col bg-neutral-900">
          <div className="flex shrink-0 items-center border-b border-neutral-800 px-3 py-1.5">
            <span className="text-[11px] uppercase tracking-widest text-neutral-500">
              preview{isMobile ? " — 390px" : " — full width"}
            </span>
          </div>
          <div className="min-h-0 flex-1">
            {}
            <div
              ref={previewViewportRef}
              data-pb-preview-root=""
              className="h-full min-h-0 overflow-auto p-10"
              style={{ position: "relative" }}
            >
              <div
                data-pb-preview-scheme={previewScheme}
                className={`min-h-full min-w-0 ${isMobile ? "mx-auto w-[390px] max-w-full" : ""}`}
                style={previewSurfaceStyle}
              >
                {parsed.status === "empty" ? (
                  <div
                    className="flex h-full items-center justify-center p-8 text-center text-sm"
                    style={{ color: "var(--pb-text-muted)" }}
                  >
                    Paste peblor JSON in the editor on the left to preview it here.
                  </div>
                ) : parsed.status === "json-error" || parsed.status === "normalise-error" ? (
                  <div className="flex h-full items-center justify-center p-8 text-center text-sm text-red-400">
                    Fix the JSON to see a preview.
                  </div>
                ) : (
                  <ScrollContainerProvider containerRef={previewViewportRef}>
                    <ServerBreakpointProvider isMobile={isMobile}>
                      <PreviewErrorBoundary key={previewResetKey} onError={handleRuntimeError}>
                        <PeblorRenderer
                          resolvedBg={
                            previewBackground.mode === "native" ? parsed.resolvedBg : null
                          }
                          resolvedSections={resolvedSections}
                          bgDefinitions={
                            previewBackground.mode === "native" ? parsed.bgDefinitions : {}
                          }
                          serverIsMobile={isMobile}
                        />
                      </PreviewErrorBoundary>
                    </ServerBreakpointProvider>
                  </ScrollContainerProvider>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

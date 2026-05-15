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
import type { ElementBlock, SectionBlock, bgBlock } from "@pb/contracts";
import { sectionBlockSchema, type Peblor } from "@pb/contracts";
import { expandPeblor } from "@pb/core/expand";
import { ServerBreakpointProvider } from "@/core/providers/device-type-provider";
import { PeblorRenderer } from "@pb/runtime-react/renderers";
import { ScrollContainerProvider } from "@pb/runtime-react/scroll";
import { z } from "zod";
import { useFigmaExportDiagnosticsStore } from "@pb/runtime-react/dev-client";
import { getPbPreviewScopeCssVars, type PbPreviewColorScheme } from "@/app/theme/config";

// ---------------------------------------------------------------------------
// Client-side breakpoint resolver
// Mirrors the logic in peblor-resolve-breakpoint-server.ts but driven
// by a boolean instead of a User-Agent / server request.
// ---------------------------------------------------------------------------

function resolveForBreakpoint<T>(value: unknown, isMobile: boolean): T | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value) && value.length === 2) {
    return (isMobile ? value[0] : value[1]) as T;
  }
  if (value !== null && typeof value === "object" && ("mobile" in value || "desktop" in value)) {
    const r = value as { mobile?: T; desktop?: T };
    return (isMobile ? (r.mobile ?? r.desktop) : (r.desktop ?? r.mobile)) as T;
  }
  return value as T;
}

const NON_RESPONSIVE_COLLECTION_KEYS = new Set([
  "elements",
  "collapsedElements",
  "revealedElements",
  "fields",
  "elementOrder",
  "sectionOrder",
]);

function valueNeedsResolution(value: unknown, key?: string): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) {
    if (key && NON_RESPONSIVE_COLLECTION_KEYS.has(key)) return false;
    return value.length === 2;
  }
  if (typeof value === "object") return "mobile" in value || "desktop" in value;
  return false;
}

function resolveObjectShallow(
  obj: Record<string, unknown>,
  isMobile: boolean
): Record<string, unknown> {
  const needsCopy = Object.keys(obj).some((k) => valueNeedsResolution(obj[k], k));
  if (!needsCopy) return obj;
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    if (valueNeedsResolution(out[key], key)) {
      out[key] = resolveForBreakpoint(out[key], isMobile);
    }
  }
  return out;
}

const ELEMENT_RESPONSIVE_KEYS = [
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "align",
  "marginLeft",
  "marginRight",
  "marginTop",
  "marginBottom",
  "padding",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "fontSize",
  "lineHeight",
  "letterSpacing",
  "textAlign",
  "fill",
  "borderRadius",
  "stroke",
  "strokeWidth",
  "opacity",
  "display",
  "hidden",
  "ariaLabel",
  "src",
  "poster",
];

function resolveElementBlock(
  el: Record<string, unknown>,
  isMobile: boolean
): Record<string, unknown> {
  const needsCopy = ELEMENT_RESPONSIVE_KEYS.some((k) => valueNeedsResolution(el[k]));
  if (!needsCopy) return el;
  const out = { ...el };
  for (const key of ELEMENT_RESPONSIVE_KEYS) {
    if (valueNeedsResolution(out[key])) {
      out[key] = resolveForBreakpoint(out[key], isMobile);
    }
  }
  return out;
}

function resolveSectionBlock(
  section: Record<string, unknown>,
  isMobile: boolean
): Record<string, unknown> {
  const out = resolveObjectShallow(section, isMobile);

  // Resolve elements array if present
  if (Array.isArray(out.elements)) {
    out.elements = (out.elements as Record<string, unknown>[]).map((el) =>
      resolveElementBlock(el, isMobile)
    );
  }
  // collapsedElements / revealedElements for revealSection
  if (Array.isArray(out.collapsedElements)) {
    out.collapsedElements = (out.collapsedElements as Record<string, unknown>[]).map((el) =>
      resolveElementBlock(el, isMobile)
    );
  }
  if (Array.isArray(out.revealedElements)) {
    out.revealedElements = (out.revealedElements as Record<string, unknown>[]).map((el) =>
      resolveElementBlock(el, isMobile)
    );
  }
  // fields for formBlock
  if (Array.isArray(out.fields)) {
    out.fields = (out.fields as Record<string, unknown>[]).map((f) =>
      resolveObjectShallow(f, isMobile)
    );
  }

  return out;
}

function resolveBreakpointClient(sections: SectionBlock[], isMobile: boolean): SectionBlock[] {
  return sections.map(
    (s) =>
      resolveSectionBlock(
        s as unknown as Record<string, unknown>,
        isMobile
      ) as unknown as SectionBlock
  );
}

// ---------------------------------------------------------------------------
// Input normaliser
// Accepts: full page object, sections array, single section, single element
// Always returns { sections: SectionBlock[] }
// ---------------------------------------------------------------------------

type NormaliseResult = { ok: true; sections: SectionBlock[] } | { ok: false; error: string };

const SECTION_TYPES = new Set([
  "contentBlock",
  "sectionColumn",
  "scrollContainer",
  "formBlock",
  "revealSection",
  "divider",
  "sectionTrigger",
]);

const ELEMENT_TYPES = new Set([
  "elementButton",
  "elementText",
  "elementImage",
  "elementVideo",
  "elementSpacer",
  "elementShape",
  "elementLottie",
  "elementRive",
  "elementModel3D",
  "elementIframe",
  "elementIcon",
  "elementForm",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getElementOrder(value: unknown): string[] | null {
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value as string[];
  }
  if (isRecord(value)) {
    if (Array.isArray(value.desktop) && value.desktop.every((item) => typeof item === "string")) {
      return value.desktop as string[];
    }
    if (Array.isArray(value.mobile) && value.mobile.every((item) => typeof item === "string")) {
      return value.mobile as string[];
    }
  }
  return null;
}

function getDefinitionMap(value: unknown): Record<string, Record<string, unknown>> {
  if (!isRecord(value)) return {};
  const definitions: Record<string, Record<string, unknown>> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isRecord(entry)) definitions[key] = entry;
  }
  return definitions;
}

function resolvePresetRefs(
  value: unknown,
  presetDefinitions: Record<string, Record<string, unknown>>,
  visited: Set<string> = new Set()
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => resolvePresetRefs(item, presetDefinitions, visited));
  }
  if (!isRecord(value)) return value;

  if (typeof value.preset === "string") {
    const presetKey = value.preset;
    const { preset: _ignored, ...local } = value;
    if (visited.has(presetKey)) {
      return resolvePresetRefs(local, presetDefinitions, visited) as Record<string, unknown>;
    }
    const preset = presetDefinitions[presetKey];
    if (!preset) {
      return resolvePresetRefs(local, presetDefinitions, visited) as Record<string, unknown>;
    }
    const merged = { ...preset, ...local };
    visited.add(presetKey);
    const resolved = resolvePresetRefs(merged, presetDefinitions, visited);
    visited.delete(presetKey);
    return resolved as Record<string, unknown>;
  }

  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key] = resolvePresetRefs(entry, presetDefinitions, visited);
  }
  return out;
}

function resolveDefinitionMapWithPresets(
  definitions: Record<string, Record<string, unknown>>,
  presetDefinitions: Record<string, Record<string, unknown>>
): Record<string, Record<string, unknown>> {
  if (Object.keys(presetDefinitions).length === 0) return definitions;
  const resolved: Record<string, Record<string, unknown>> = {};
  for (const [key, entry] of Object.entries(definitions)) {
    const next = resolvePresetRefs(entry, presetDefinitions);
    if (isRecord(next)) {
      resolved[key] = next;
    }
  }
  return resolved;
}

function isElementLike(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    (ELEMENT_TYPES.has(value.type) || value.type.startsWith("element"))
  );
}

function isSectionLike(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && typeof value.type === "string" && SECTION_TYPES.has(value.type);
}

function isModuleLike(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    isRecord(value.slots) &&
    (value.type === "module" || value.type == null || typeof value.type === "string")
  );
}

function pickStringField(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  key: string
): void {
  const value = source[key];
  if (typeof value === "string" && value.length > 0) {
    target[key] = value;
  }
}

function buildModuleSlotWrapperStyle(slot: Record<string, unknown>): Record<string, unknown> {
  const wrapperStyle: Record<string, unknown> = {};
  const slotStyle = slot.style;
  if (isRecord(slotStyle)) {
    Object.assign(wrapperStyle, slotStyle);
  }
  pickStringField(wrapperStyle, slot, "position");
  pickStringField(wrapperStyle, slot, "inset");
  pickStringField(wrapperStyle, slot, "top");
  pickStringField(wrapperStyle, slot, "left");
  pickStringField(wrapperStyle, slot, "right");
  pickStringField(wrapperStyle, slot, "bottom");
  if (typeof slot.zIndex === "number") {
    wrapperStyle.zIndex = slot.zIndex;
  }
  return wrapperStyle;
}

function buildModulePreviewSections(
  modules: Record<string, Record<string, unknown>>,
  presetDefinitions: Record<string, Record<string, unknown>>
): SectionBlock[] {
  const sections: SectionBlock[] = [];

  for (const [moduleKey, moduleDef] of Object.entries(modules)) {
    if (!isModuleLike(moduleDef)) continue;

    const slotsObj = moduleDef.slots as Record<string, unknown>;
    const contentSlotKey =
      typeof moduleDef.contentSlot === "string" && moduleDef.contentSlot.length > 0
        ? moduleDef.contentSlot
        : "main";
    const moduleStyle = isRecord(moduleDef.style)
      ? (moduleDef.style as Record<string, unknown>)
      : null;

    const slotEntries = Object.entries(slotsObj).filter(([, slot]) => isRecord(slot)) as Array<
      [string, Record<string, unknown>]
    >;
    if (slotEntries.length === 0) continue;

    const orderedSlotEntries = slotEntries.sort(([a], [b]) => {
      if (a === contentSlotKey && b !== contentSlotKey) return -1;
      if (b === contentSlotKey && a !== contentSlotKey) return 1;
      return 0;
    });

    const slotDefinitions: Record<string, Record<string, unknown>> = {};
    const slotOrder: string[] = [];

    for (const [slotKey, slot] of orderedSlotEntries) {
      const slotSection = isRecord(slot.section) ? slot.section : {};
      const definitions = resolveDefinitionMapWithPresets(
        getDefinitionMap(slotSection.definitions),
        presetDefinitions
      );
      const elementOrder = getElementOrder(slotSection.elementOrder) ?? Object.keys(definitions);

      const slotWrapperStyle = buildModuleSlotWrapperStyle(slot);
      const hasShell =
        Object.keys(slotWrapperStyle).length > 0 ||
        typeof slot.display === "string" ||
        typeof slot.flexDirection === "string" ||
        typeof slot.alignItems === "string" ||
        typeof slot.justifyContent === "string" ||
        typeof slot.gap === "string" ||
        typeof slot.padding === "string";
      if (elementOrder.length === 0 && !hasShell) continue;

      const slotId = `${moduleKey}--slot-${slotKey}`;
      const slotElement: Record<string, unknown> = {
        type: "elementGroup",
        id: slotId,
        section: {
          definitions,
          ...(elementOrder.length > 0 ? { elementOrder } : {}),
        },
      };
      pickStringField(slotElement, slot, "display");
      pickStringField(slotElement, slot, "flexDirection");
      pickStringField(slotElement, slot, "alignItems");
      pickStringField(slotElement, slot, "justifyContent");
      pickStringField(slotElement, slot, "gap");
      pickStringField(slotElement, slot, "padding");
      if (Object.keys(slotWrapperStyle).length > 0) {
        slotElement.wrapperStyle = slotWrapperStyle;
      }

      slotDefinitions[slotId] = slotElement;
      slotOrder.push(slotId);
    }

    if (slotOrder.length === 0) continue;

    const wrapperId = `${moduleKey}--preview`;
    const wrapperStyle: Record<string, unknown> = {
      position: "relative",
      ...(moduleStyle ?? {}),
    };

    const wrapperElement: Record<string, unknown> = {
      type: "elementGroup",
      id: wrapperId,
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
      justifyContent: "flex-start",
      width: "100%",
      wrapperStyle,
      section: {
        elementOrder: slotOrder,
        definitions: slotDefinitions,
      },
    };

    sections.push({
      type: "contentBlock",
      id: `playground-module-${moduleKey}`,
      elements: [wrapperElement as ElementBlock],
    } as unknown as SectionBlock);
  }

  return sections;
}

function expandSectionDefinitions(
  section: Record<string, unknown>,
  inheritedDefinitions?: Record<string, Record<string, unknown>>,
  presetDefinitions?: Record<string, Record<string, unknown>>
): Record<string, unknown> {
  const resolvedSection =
    Object.keys(presetDefinitions ?? {}).length > 0
      ? (resolvePresetRefs(section, presetDefinitions ?? {}) as Record<string, unknown>)
      : section;

  if (
    Array.isArray(resolvedSection.elements) &&
    !resolvedSection.elements.some((item) => typeof item === "string")
  ) {
    return resolvedSection;
  }

  const order =
    getElementOrder(resolvedSection.elementOrder) ??
    (Array.isArray(resolvedSection.elements) &&
    resolvedSection.elements.every((item) => typeof item === "string")
      ? (resolvedSection.elements as string[])
      : null);
  if (!order?.length) return resolvedSection;

  const definitions = {
    ...(inheritedDefinitions ?? {}),
    ...getDefinitionMap(resolvedSection.definitions),
  };
  const resolvedDefinitions = resolveDefinitionMapWithPresets(definitions, presetDefinitions ?? {});
  const idCounts = new Map<string, number>();

  const elements = order
    .map((key) => {
      const definition = resolvedDefinitions[key];
      if (!definition || typeof definition.type !== "string") return null;
      const baseId =
        typeof definition.id === "string" && definition.id.trim().length > 0 ? definition.id : key;
      const nextCount = (idCounts.get(baseId) ?? 0) + 1;
      idCounts.set(baseId, nextCount);
      const uniqueId = nextCount === 1 ? baseId : `${baseId}__${nextCount}`;
      return { ...definition, id: uniqueId };
    })
    .filter((value): value is Record<string, unknown> & { id: string } => value != null);

  if (elements.length === 0) return resolvedSection;
  return { ...resolvedSection, elements };
}

function expandSections(
  sections: unknown[],
  inheritedDefinitions?: Record<string, Record<string, unknown>>,
  presetDefinitions?: Record<string, Record<string, unknown>>
): SectionBlock[] {
  return sections.map((section) =>
    isRecord(section)
      ? (expandSectionDefinitions(section, inheritedDefinitions, presetDefinitions) as SectionBlock)
      : (section as SectionBlock)
  );
}

function normaliseInput(
  raw: unknown,
  inheritedPresetDefinitions: Record<string, Record<string, unknown>> = {}
): NormaliseResult {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    if (Array.isArray(raw)) {
      if (raw.every(isElementLike)) {
        return {
          ok: true,
          sections: [
            {
              type: "contentBlock",
              id: "playground-wrapper",
              overflow: "visible",
              elements: raw,
            } as unknown as SectionBlock,
          ],
        };
      }
      return { ok: true, sections: expandSections(raw) };
    }
    return { ok: false, error: "Expected an object or array at the root." };
  }

  const obj = raw as Record<string, unknown>;
  const inlinePresetDefinitions = getDefinitionMap(obj.preset);
  const localPresetDefinitions = {
    ...inheritedPresetDefinitions,
    ...inlinePresetDefinitions,
    ...(isRecord(obj.presets) ? getDefinitionMap(obj.presets) : {}),
  };
  const inheritedDefinitions = resolveDefinitionMapWithPresets(
    getDefinitionMap(obj.definitions),
    localPresetDefinitions
  );

  // Full page: { sections: [...] }
  if (Array.isArray(obj.sections)) {
    return {
      ok: true,
      sections: expandSections(obj.sections, inheritedDefinitions, localPresetDefinitions),
    };
  }

  // Page builder page: { sectionOrder: [...], definitions: { ... } }
  if (Array.isArray(obj.sectionOrder)) {
    const sections = obj.sectionOrder
      .map((key) => (typeof key === "string" ? inheritedDefinitions[key] : null))
      .filter((section): section is Record<string, unknown> => isSectionLike(section))
      .map(
        (section) =>
          expandSectionDefinitions(
            section,
            inheritedDefinitions,
            localPresetDefinitions
          ) as SectionBlock
      );
    if (sections.length > 0) {
      return { ok: true, sections };
    }
  }

  // Plugin ExportResult: { pages: { slug: { sections: [...] } }, presets: {}, ... }
  // Flatten all pages into one sections list, or just take the first page.
  if (obj.pages && typeof obj.pages === "object" && !Array.isArray(obj.pages)) {
    const exportPresetDefinitions = getDefinitionMap(obj.presets);
    const allSections: SectionBlock[] = [];
    for (const page of Object.values(obj.pages as Record<string, unknown>)) {
      const normalisedPage = normaliseInput(page, exportPresetDefinitions);
      if (normalisedPage.ok) {
        allSections.push(...normalisedPage.sections);
      }
    }
    if (allSections.length > 0) return { ok: true, sections: allSections };
  }

  // Plugin payload wrapper: { payload: ExportResult, type: "result", ... }
  if (obj.payload && typeof obj.payload === "object") {
    return normaliseInput(obj.payload, inheritedPresetDefinitions);
  }

  // Module exports / module-only payloads:
  // { modules: { myModule: { type: "module", ... } } }
  if (isRecord(obj.modules)) {
    const moduleSections = buildModulePreviewSections(
      getDefinitionMap(obj.modules),
      localPresetDefinitions
    );
    if (moduleSections.length > 0) {
      return { ok: true, sections: moduleSections };
    }
  }

  // Single module object
  if (isModuleLike(obj)) {
    const moduleSections = buildModulePreviewSections({ preview: obj }, localPresetDefinitions);
    if (moduleSections.length > 0) {
      return { ok: true, sections: moduleSections };
    }
  }

  // Sections array at root level (array case handled above, but also handle
  // the case where someone pastes an object with numeric keys — unlikely,
  // just return an error for that).

  // Single section — has a "type" field that matches known section types
  if (typeof obj.type === "string" && SECTION_TYPES.has(obj.type)) {
    return {
      ok: true,
      sections: [
        expandSectionDefinitions(obj, inheritedDefinitions, localPresetDefinitions) as SectionBlock,
      ],
    };
  }

  // Single element — has a "type" field starting with "element" or is a known element type
  if (
    typeof obj.type === "string" &&
    (ELEMENT_TYPES.has(obj.type) || obj.type.startsWith("element"))
  ) {
    const wrappedSection = {
      type: "contentBlock",
      id: "playground-wrapper",
      overflow: "visible",
      elements: [obj],
    } as unknown as SectionBlock;
    return { ok: true, sections: [wrappedSection] };
  }

  // No recognised shape — try treating it as a single section anyway
  // (user might have a custom type or a non-standard field)
  if (typeof obj.type === "string") {
    return {
      ok: true,
      sections: [expandSectionDefinitions(obj, inheritedDefinitions) as SectionBlock],
    };
  }

  return {
    ok: false,
    error:
      'Could not recognise the input shape. Expected { "sections": [...] }, a sections array, a page object, module exports, a single section object, or a single element object.',
  };
}

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
    } catch {
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

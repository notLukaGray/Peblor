/**
 * Export result handling, clipboard copy, and button event wiring.
 */

import type {
  ExportArtifact,
  ExportResult,
  SectionExportArtifact,
  UIToMainMessage,
} from "./types/figma-plugin";
import { buildFigmaExportDiagnostics } from "./export-parity";
import type { FramePreviewItem } from "./ui-state";
import { collectOverrides } from "./ui-state";
import { buildExportZip } from "./ui-zip";
import { setStatus, setSummary } from "./ui-status";
export { setStatus } from "./ui-status";

// ---------------------------------------------------------------------------
// DOM element references (assembled by ui.ts at init)
// ---------------------------------------------------------------------------

export interface UIElements {
  exportBtn: HTMLButtonElement;
  actionRowEl: HTMLDivElement;
  copyJsonBtn: HTMLButtonElement;
  copyMergedPageBtn: HTMLButtonElement;
  copyErrorsBtn: HTMLButtonElement;
  downloadBtn: HTMLButtonElement;
  statusEl: HTMLDivElement;
  summaryEl: HTMLDivElement;
  warningsEl: HTMLDivElement;
  previewEl: HTMLDivElement;
  autoPresetToggle: HTMLInputElement;
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

export let pendingResult: ExportResult | null = null;
export let pendingBlob: Blob | null = null;
export let pendingErrorsPayload: string | null = null;

export function setPendingResult(r: ExportResult | null): void {
  pendingResult = r;
}
export function setPendingBlob(b: Blob | null): void {
  pendingBlob = b;
}
export function setPendingErrorsPayload(payload: string | null): void {
  pendingErrorsPayload = payload;
}

// ---------------------------------------------------------------------------
// Message sending
// ---------------------------------------------------------------------------

export function sendToMain(msg: UIToMainMessage): void {
  parent.postMessage({ pluginMessage: msg }, "*");
}

// ---------------------------------------------------------------------------
// Clipboard
// ---------------------------------------------------------------------------

export async function copyToClipboard(text: string): Promise<void> {
  // execCommand is synchronous — it runs within the user-gesture context of the
  // originating click. navigator.clipboard.writeText() is async, so by the time
  // it resolves/rejects the gesture context may have expired (especially inside
  // Figma's sandboxed data: URL iframe). Try execCommand first.
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) return;
  } catch {
    // execCommand unavailable — fall through to Clipboard API
  }
  await navigator.clipboard.writeText(text);
}

export function flashCopied(copyJsonBtn: HTMLButtonElement): void {
  flashButtonLabel(copyJsonBtn, "Copied!", "Copy JSON");
}

export function flashMergedCopied(btn: HTMLButtonElement): void {
  flashButtonLabel(btn, "Copied!", "Copy page JSON");
}
export function flashErrorsCopied(btn: HTMLButtonElement): void {
  flashButtonLabel(btn, "Copied!", "Copy errors");
}

function flashButtonLabel(btn: HTMLButtonElement, doneLabel: string, restoreLabel: string): void {
  btn.classList.add("copied");
  btn.textContent = doneLabel;
  setTimeout(() => {
    btn.classList.remove("copied");
    btn.textContent = restoreLabel;
  }, 1500);
}

/** One merged page object for /playground paste / disk; multiple pages → `{ pages }` root. */
export function mergedPageClipboardPayload(result: ExportResult): string {
  const keys = Object.keys(result.pages);
  if (keys.length === 0) return "{}";
  if (keys.length === 1) {
    const first = keys[0];
    const pageRaw = result.pages[first];
    const pageRec =
      pageRaw !== null && typeof pageRaw === "object" && !Array.isArray(pageRaw)
        ? { ...(pageRaw as Record<string, unknown>) }
        : {};
    const parity = result.trace?.counts?.parity;
    const category = result.trace?.counts?.category ?? {};
    if (parity !== undefined) {
      pageRec["figmaExportDiagnostics"] = buildFigmaExportDiagnostics(parity, category);
    }
    return JSON.stringify(pageRec, null, 2);
  }
  const parity = result.trace?.counts?.parity;
  const category = result.trace?.counts?.category ?? {};
  const envelope: Record<string, unknown> = { pages: result.pages, presets: result.presets };
  if (parity !== undefined) {
    envelope["figmaExportDiagnostics"] = buildFigmaExportDiagnostics(parity, category);
  }
  return JSON.stringify(envelope, null, 2);
}

// ---------------------------------------------------------------------------
// Result handler
// ---------------------------------------------------------------------------

export async function handleResult(
  els: UIElements,
  result: ExportResult,
  errors: string[],
  warningCount: number,
  infoCount: number,
  mode: "copy" | "copy-merged" | "zip" = "zip",
  artifact: ExportArtifact = "full",
  sectionArtifact?: SectionExportArtifact,
  force = false
): Promise<void> {
  if (errors.length > 0) {
    const errDiv = document.createElement("div");
    errDiv.className = "export-error-summary";
    errDiv.textContent = `${errors.length} error${errors.length !== 1 ? "s" : ""} during export — output may be incomplete`;
    els.warningsEl.prepend(errDiv);
  }

  if (errors.length > 0 && !force) {
    setStatus(
      els.statusEl,
      `Export blocked: ${errors.length} error${errors.length !== 1 ? "s" : ""} present. Use --force to override.`,
      "error"
    );
    setSummary(els.summaryEl, result);
    els.actionRowEl.style.display = "flex";
    els.copyErrorsBtn.disabled = false;
    return;
  }

  const hasAnyContent =
    Object.keys(result.pages).length > 0 ||
    Object.keys(result.presets).length > 0 ||
    Object.keys(result.modals).length > 0 ||
    Object.keys(result.modules).length > 0 ||
    Object.keys(result.globals.buttons ?? {}).length > 0 ||
    Object.keys(result.globals.backgrounds ?? {}).length > 0 ||
    Object.keys(result.globals.elements ?? {}).length > 0;

  if (!hasAnyContent && artifact !== "section") {
    setStatus(els.statusEl, "Export produced no content.", "error");
    return;
  }

  if (artifact === "section") {
    if (!sectionArtifact) {
      setStatus(els.statusEl, "Section export failed: missing section artifact payload.", "error");
      return;
    }
    try {
      await copyToClipboard(JSON.stringify(sectionArtifact, null, 2));
      setStatus(
        els.statusEl,
        `Done! Copied section artifact (${sectionArtifact.sectionId})`,
        errors.length > 0 ? "error" : "success"
      );
      flashCopied(els.copyJsonBtn);
      els.copyErrorsBtn.disabled = false;
      return;
    } catch (err) {
      setStatus(els.statusEl, `Copy failed: ${String(err)}`, "error");
      return;
    }
  }

  if (mode === "copy") {
    setPendingResult(result);
    const pageCount = Object.keys(result.pages).length;
    const statusMsg =
      errors.length > 0
        ? `Done with ${errors.length} error${errors.length !== 1 ? "s" : ""} — JSON copied`
        : `Done! Exported ${pageCount} page(s).`;
    try {
      await copyToClipboard(resultToJson(result));
      setStatus(els.statusEl, statusMsg, errors.length > 0 ? "error" : "success");
      flashCopied(els.copyJsonBtn);
    } catch (err) {
      setStatus(els.statusEl, `Copy failed: ${String(err)}`, "error");
    }
    setSummary(els.summaryEl, result);
    els.actionRowEl.style.display = "flex";
    els.copyErrorsBtn.disabled = false;
    return;
  }

  if (mode === "copy-merged") {
    setPendingResult(result);
    const pageCount = Object.keys(result.pages).length;
    const statusMsg =
      errors.length > 0
        ? `Done with errors — merged page JSON copied`
        : pageCount === 1
          ? `Done! Copied single page document for /playground or content.`
          : `Done! Copied ${pageCount} pages as { pages, presets } wrapper (/playground compatible).`;
    try {
      await copyToClipboard(mergedPageClipboardPayload(result));
      setStatus(els.statusEl, statusMsg, errors.length > 0 ? "error" : "success");
      flashMergedCopied(els.copyMergedPageBtn);
    } catch (err) {
      setStatus(els.statusEl, `Copy failed: ${String(err)}`, "error");
    }
    setSummary(els.summaryEl, result);
    els.actionRowEl.style.display = "flex";
    els.copyErrorsBtn.disabled = false;
    return;
  }

  // ZIP mode
  setPendingResult(result);
  setStatus(els.statusEl, "Packaging ZIP…");
  try {
    const blob = await buildExportZip(result, errors, warningCount, infoCount);
    setPendingBlob(blob);
    const pageCount = Object.keys(result.pages).length;
    const statusMsg =
      errors.length > 0
        ? `Done with ${errors.length} error${errors.length !== 1 ? "s" : ""} — check export-notes.txt`
        : `Done! Exported ${pageCount} page(s) and ${result.assets.length} asset(s).`;
    setStatus(els.statusEl, statusMsg, errors.length > 0 ? "error" : "success");
    setSummary(els.summaryEl, result);
    els.actionRowEl.style.display = "flex";
    els.copyErrorsBtn.disabled = false;
  } catch (err) {
    setStatus(els.statusEl, `ZIP packaging failed: ${String(err)}`, "error");
  }
}

export function sendSectionExport(
  frame: FramePreviewItem,
  currentFrames: FramePreviewItem[],
  autoPresets: boolean
): void {
  const { targetOverrides, annotationOverrides, cdnPrefixOverrides } =
    collectOverrides(currentFrames);
  // Section artifacts should work for non-prefixed frames.
  // Keep page/preset/modal targets as-is; coerce everything else to page.
  if (
    !frame.responsivePairKey &&
    frame.target.type !== "page" &&
    frame.target.type !== "preset" &&
    frame.target.type !== "modal"
  ) {
    targetOverrides[frame.id] = "page";
  }
  sendToMain({
    type: "export",
    mode: "copy",
    artifact: "section",
    scope: "single-frame",
    frameId: frame.id,
    responsivePairKey: frame.responsivePairKey,
    targetOverrides,
    annotationOverrides,
    cdnPrefixOverrides,
    autoPresets,
  });
}

// ---------------------------------------------------------------------------
// Button wiring
// ---------------------------------------------------------------------------

export function wireExportButton(
  els: UIElements,
  getCurrentFrames: () => FramePreviewItem[]
): void {
  els.exportBtn.addEventListener("click", () => {
    els.exportBtn.disabled = true;
    els.copyJsonBtn.disabled = true;
    els.copyMergedPageBtn.disabled = true;
    els.copyErrorsBtn.disabled = true;
    setPendingResult(null);
    setPendingBlob(null);
    setPendingErrorsPayload(null);
    els.actionRowEl.style.display = "none";
    els.summaryEl.style.display = "none";
    els.previewEl.style.display = "none";
    setStatus(els.statusEl, "Starting export…");
    els.warningsEl.innerHTML = "";
    const { targetOverrides, annotationOverrides, cdnPrefixOverrides } =
      collectOverrides(getCurrentFrames());
    sendToMain({
      type: "export",
      targetOverrides,
      annotationOverrides,
      cdnPrefixOverrides,
      autoPresets: els.autoPresetToggle.checked,
    });
  });
}

/** Strip binary asset data before serialising — Uint8Array is useless in JSON. */
function resultToJson(result: ExportResult): string {
  const copy = {
    ...result,
    assets: result.assets.map((a) => ({ filename: a.filename })),
  };
  return JSON.stringify(copy, null, 2);
}

export function wireCopyJsonButton(
  els: UIElements,
  getCurrentFrames: () => FramePreviewItem[]
): void {
  els.copyJsonBtn.addEventListener("click", () => {
    if (pendingResult) {
      void copyToClipboard(resultToJson(pendingResult)).then(() => flashCopied(els.copyJsonBtn));
      return;
    }
    els.copyJsonBtn.disabled = true;
    els.copyMergedPageBtn.disabled = true;
    els.copyErrorsBtn.disabled = true;
    els.copyJsonBtn.textContent = "Exporting…";
    const { targetOverrides, annotationOverrides, cdnPrefixOverrides } =
      collectOverrides(getCurrentFrames());
    sendToMain({
      type: "export",
      mode: "copy",
      targetOverrides,
      annotationOverrides,
      cdnPrefixOverrides,
      autoPresets: els.autoPresetToggle.checked,
    });
  });
}

export function wireCopyMergedPageButton(
  els: UIElements,
  getCurrentFrames: () => FramePreviewItem[]
): void {
  els.copyMergedPageBtn.addEventListener("click", () => {
    if (pendingResult) {
      void copyToClipboard(mergedPageClipboardPayload(pendingResult)).then(() =>
        flashMergedCopied(els.copyMergedPageBtn)
      );
      return;
    }
    els.copyJsonBtn.disabled = true;
    els.copyMergedPageBtn.disabled = true;
    els.copyErrorsBtn.disabled = true;
    els.copyMergedPageBtn.textContent = "Exporting…";
    const { targetOverrides, annotationOverrides, cdnPrefixOverrides } =
      collectOverrides(getCurrentFrames());
    sendToMain({
      type: "export",
      mode: "copy-merged",
      targetOverrides,
      annotationOverrides,
      cdnPrefixOverrides,
      autoPresets: els.autoPresetToggle.checked,
    });
  });
}

export function wireDownloadButton(
  els: UIElements,
  getCurrentFrames: () => FramePreviewItem[]
): void {
  els.downloadBtn.addEventListener("click", () => {
    if (!pendingBlob) {
      els.exportBtn.disabled = true;
      els.copyJsonBtn.disabled = true;
      els.copyMergedPageBtn.disabled = true;
      els.copyErrorsBtn.disabled = true;
      els.actionRowEl.style.display = "none";
      els.summaryEl.style.display = "none";
      els.previewEl.style.display = "none";
      setStatus(els.statusEl, "Starting export…");
      els.warningsEl.innerHTML = "";
      const { targetOverrides, annotationOverrides, cdnPrefixOverrides } =
        collectOverrides(getCurrentFrames());
      sendToMain({
        type: "export",
        mode: "zip",
        targetOverrides,
        annotationOverrides,
        cdnPrefixOverrides,
        autoPresets: els.autoPresetToggle.checked,
      });
      return;
    }
    const url = URL.createObjectURL(pendingBlob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "peblor-export.zip";
    anchor.click();
    URL.revokeObjectURL(url);
  });
}

export function wireCopyErrorsButton(
  els: UIElements,
  getCurrentFrames: () => FramePreviewItem[]
): void {
  els.copyErrorsBtn.addEventListener("click", () => {
    if (pendingErrorsPayload) {
      void copyToClipboard(pendingErrorsPayload).then(() => flashErrorsCopied(els.copyErrorsBtn));
      return;
    }

    els.copyJsonBtn.disabled = true;
    els.copyMergedPageBtn.disabled = true;
    els.copyErrorsBtn.disabled = true;
    els.copyErrorsBtn.textContent = "Exporting…";
    const { targetOverrides, annotationOverrides, cdnPrefixOverrides } =
      collectOverrides(getCurrentFrames());
    sendToMain({
      type: "export",
      mode: "zip",
      targetOverrides,
      annotationOverrides,
      cdnPrefixOverrides,
      autoPresets: els.autoPresetToggle.checked,
    });
  });
}

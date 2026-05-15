/**
 * UI thread entry point.
 * Runs in the plugin's browser iframe — has full DOM and can use libraries.
 * Communicates with the main thread via parent.postMessage / window.onmessage.
 */

import type { MainToUIMessage } from "./types/figma-plugin";
import {
  collectOverrides,
  getAutoPresetSetting,
  setAutoPresetSetting,
  type FramePreviewItem,
} from "./ui-state";
import { renderPreview } from "./ui-render";
import {
  handleResult,
  sendSectionExport,
  sendToMain,
  setStatus,
  wireExportButton,
  wireCopyJsonButton,
  wireCopyErrorsButton,
  wireCopyMergedPageButton,
  wireDownloadButton,
  type UIElements,
} from "./ui-export";

// ---------------------------------------------------------------------------
// DOM element references
// ---------------------------------------------------------------------------

const exportBtn = document.getElementById("export-btn") as HTMLButtonElement;
const actionRowEl = document.getElementById("action-row") as HTMLDivElement;
const copyJsonBtn = document.getElementById("copy-json-btn") as HTMLButtonElement;
const copyMergedPageBtn = document.getElementById("copy-merged-page-btn") as HTMLButtonElement;
const copyErrorsBtn = document.getElementById("copy-errors-btn") as HTMLButtonElement;
const downloadBtn = document.getElementById("download-btn") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const summaryEl = document.getElementById("summary") as HTMLDivElement;
const warningsEl = document.getElementById("warnings") as HTMLDivElement;
const previewEl = document.getElementById("preview-panel") as HTMLDivElement;
const autoPresetToggle = document.getElementById("auto-presets-toggle") as HTMLInputElement;

const els: UIElements = {
  exportBtn,
  actionRowEl,
  copyJsonBtn,
  copyMergedPageBtn,
  copyErrorsBtn,
  downloadBtn,
  statusEl,
  summaryEl,
  warningsEl,
  previewEl,
  autoPresetToggle,
};

// ---------------------------------------------------------------------------
// Current frame list
// ---------------------------------------------------------------------------

let currentFrames: FramePreviewItem[] = [];
const getCurrentFrames = (): FramePreviewItem[] => currentFrames;

// ---------------------------------------------------------------------------
// Auto preset toggle
// ---------------------------------------------------------------------------

autoPresetToggle.checked = getAutoPresetSetting();
autoPresetToggle.addEventListener("change", () => {
  setAutoPresetSetting(autoPresetToggle.checked);
  sendToMain({
    type: "refresh-preview",
    targetOverrides: collectOverrides(getCurrentFrames()).targetOverrides,
    autoPresets: autoPresetToggle.checked,
  });
});

// ---------------------------------------------------------------------------
// Button wiring
// ---------------------------------------------------------------------------

wireExportButton(els, getCurrentFrames);
wireCopyJsonButton(els, getCurrentFrames);
wireCopyMergedPageButton(els, getCurrentFrames);
wireCopyErrorsButton(els, getCurrentFrames);
wireDownloadButton(els, getCurrentFrames);

// Ensure the main plugin process is closed when the UI is dismissed.
// This avoids stale plugin runtimes that can block subsequent launches.
let closeSent = false;
function notifyPluginClose(): void {
  if (closeSent) return;
  closeSent = true;
  sendToMain({ type: "close" });
}
window.addEventListener("beforeunload", notifyPluginClose);
window.addEventListener("pagehide", notifyPluginClose);

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

window.onmessage = async (event: MessageEvent) => {
  const msg = event.data?.pluginMessage as MainToUIMessage | undefined;
  if (!msg) return;

  switch (msg.type) {
    case "progress":
      setStatus(statusEl, msg.message);
      break;

    case "preview":
      currentFrames = msg.items.map((item) => ({
        ...item,
        responsivePairKey: (item as typeof item & { responsivePairKey?: string }).responsivePairKey,
      }));
      renderPreview(previewEl, currentFrames, currentFrames, (frame) => {
        exportBtn.disabled = true;
        copyJsonBtn.disabled = true;
        copyMergedPageBtn.disabled = true;
        copyErrorsBtn.disabled = true;
        setStatus(statusEl, `Exporting section for "${frame.name}"…`);
        sendSectionExport(frame, getCurrentFrames(), autoPresetToggle.checked);
      });
      break;

    case "error":
      setStatus(statusEl, msg.message, "error");
      exportBtn.disabled = false;
      break;

    case "result":
      await handleResult(
        els,
        msg.payload,
        msg.errors,
        msg.warningCount,
        msg.infoCount,
        msg.mode,
        msg.artifact,
        msg.sectionArtifact
      );
      exportBtn.disabled = false;
      copyJsonBtn.disabled = false;
      copyJsonBtn.textContent = "Copy JSON";
      copyMergedPageBtn.disabled = false;
      copyMergedPageBtn.textContent = "Copy page JSON";
      copyErrorsBtn.disabled = false;
      copyErrorsBtn.textContent = "Copy errors";
      sendToMain({
        type: "refresh-preview",
        targetOverrides: collectOverrides(getCurrentFrames()).targetOverrides,
        autoPresets: autoPresetToggle.checked,
      });
      break;
  }
};

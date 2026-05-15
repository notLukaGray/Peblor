/**
 * Main thread entry point.
 * Runs in Figma's sandboxed JS environment — no DOM, no fetch.
 * Communicates with the UI thread via figma.ui.postMessage / figma.ui.onmessage.
 */

import type { UIToMainMessage } from "./types/figma-plugin";
import { refreshPreview, runExport } from "./main-run-export";

figma.showUI(__html__, { width: 400, height: 560, title: "Page Builder Export" });

figma.ui.onmessage = async (msg: UIToMainMessage) => {
  if (msg.type === "export") {
    await runExport(
      msg.targetOverrides ?? {},
      msg.annotationOverrides ?? {},
      msg.cdnPrefixOverrides ?? {},
      msg.mode ?? "zip",
      msg.autoPresets ?? false,
      msg.scope ?? "all-selected",
      msg.frameId,
      msg.artifact ?? "full",
      msg.responsivePairKey
    );
    return;
  }

  if (msg.type === "refresh-preview") {
    refreshPreview(msg.targetOverrides, msg.autoPresets ?? false);
    return;
  }

  if (msg.type === "close") {
    figma.closePlugin();
    return;
  }
};

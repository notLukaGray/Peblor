/**
 * UI status bar, warnings panel, and post-export summary rendering.
 */

import type { ExportResult } from "./types/figma-plugin";

export function setStatus(
  statusEl: HTMLDivElement,
  message: string,
  type: "info" | "error" | "success" = "info"
): void {
  statusEl.textContent = message;
  statusEl.className = type === "info" ? "" : type;
}

export function setWarnings(warningsEl: HTMLDivElement, warnings: string[]): void {
  const regularWarnings = warnings.filter((w) => !w.startsWith("[proto-interaction]"));
  if (regularWarnings.length === 0) {
    warningsEl.innerHTML = "";
    return;
  }

  type Severity = "error" | "warn" | "info";
  const severityOrder: Severity[] = ["error", "warn", "info"];

  const getSeverity = (w: string): Severity => {
    if (w.startsWith("[error]")) return "error";
    if (w.startsWith("[info]") || w.startsWith("[docs]")) return "info";
    return "warn";
  };

  const stripSeverityPrefix = (w: string): string => w.replace(/^\[(error|info|docs)\]\s*/i, "");

  const entries = regularWarnings.map((w) => ({
    raw: w,
    severity: getSeverity(w),
    message: stripSeverityPrefix(w),
  }));

  const header = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = `${regularWarnings.length} comment(s)`;
  header.appendChild(summary);

  for (const severity of severityOrder) {
    const items = entries.filter((entry) => entry.severity === severity);
    if (items.length === 0) continue;

    const group = document.createElement("div");
    group.className = `comments-group comments-group--${severity}`;

    const title = document.createElement("div");
    title.className = "comments-group-title";
    const label = severity === "error" ? "Errors" : severity === "warn" ? "Warnings" : "Info";
    title.textContent = `${label} (${items.length})`;
    group.appendChild(title);

    const list = document.createElement("ul");
    list.className = "warnings-list";
    for (const entry of items) {
      const li = document.createElement("li");
      li.className = `comment-item comment-item--${entry.severity}`;

      const tag = document.createElement("span");
      tag.className = `comment-tag comment-tag--${entry.severity}`;
      tag.textContent =
        entry.severity === "error" ? "Error" : entry.severity === "warn" ? "Warn" : "Info";

      const msg = document.createElement("span");
      msg.className = "comment-message";
      msg.textContent = entry.message;

      li.appendChild(tag);
      li.appendChild(msg);
      list.appendChild(li);
    }

    group.appendChild(list);
    header.appendChild(group);
  }

  warningsEl.innerHTML = "";
  warningsEl.appendChild(header);
}

export function setSummary(summaryEl: HTMLDivElement, result: ExportResult): void {
  const regularWarnings = result.warnings.filter((w) => !w.startsWith("[proto-interaction]"));
  const protoCount = result.warnings.filter((w) => w.startsWith("[proto-interaction]")).length;
  const errorCount = regularWarnings.filter((w) => w.startsWith("[error]")).length;
  const infoCount = regularWarnings.filter(
    (w) => w.startsWith("[info]") || w.startsWith("[docs]")
  ).length;
  const warnCount = Math.max(0, regularWarnings.length - errorCount - infoCount);
  const pageCount = Object.keys(result.pages).length;
  const presetCount = Object.keys(result.presets).length;
  const modalCount = Object.keys(result.modals).length;
  const moduleCount = Object.keys(result.modules).length;
  const globalsCount =
    Object.keys(result.globals.buttons ?? {}).length +
    Object.keys(result.globals.backgrounds ?? {}).length +
    Object.keys(result.globals.elements ?? {}).length;

  const parts: string[] = [];
  if (pageCount > 0) parts.push(`${pageCount} page${pageCount !== 1 ? "s" : ""}`);
  if (presetCount > 0) parts.push(`${presetCount} section${presetCount !== 1 ? "s" : ""}`);
  if (modalCount > 0) parts.push(`${modalCount} modal${modalCount !== 1 ? "s" : ""}`);
  if (moduleCount > 0) parts.push(`${moduleCount} module${moduleCount !== 1 ? "s" : ""}`);
  if (globalsCount > 0) parts.push(`${globalsCount} global${globalsCount !== 1 ? "s" : ""}`);
  parts.push(`${result.assets.length} asset${result.assets.length !== 1 ? "s" : ""}`);
  if (regularWarnings.length > 0) {
    const segments: string[] = [];
    if (errorCount > 0) segments.push(`${errorCount} error${errorCount !== 1 ? "s" : ""}`);
    if (warnCount > 0) segments.push(`${warnCount} warning${warnCount !== 1 ? "s" : ""}`);
    if (infoCount > 0) segments.push(`${infoCount} info${infoCount !== 1 ? "s" : ""}`);
    parts.push(
      `${regularWarnings.length} comment${regularWarnings.length !== 1 ? "s" : ""}${segments.length ? ` (${segments.join(", ")})` : ""}`
    );
  }
  if (protoCount > 0)
    parts.push(`${protoCount} prototype interaction${protoCount !== 1 ? "s" : ""}`);

  summaryEl.textContent = parts.join(" · ");
  summaryEl.style.display = "block";
}

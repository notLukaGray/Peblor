/**
 * Renders a single frame preview row: badge, name, issue count, override select,
 * CDN prefix input, issues list, and advanced options panel.
 */

import type { FramePreviewItem } from "./ui-state";
import {
  getTargetOverride,
  setTargetOverride,
  getAnnotationOverrides,
  setAnnotationOverride,
  getCdnPrefixOverride,
  setCdnPrefixOverride,
} from "./ui-state";
import {
  TARGET_BADGE_COLORS,
  TARGET_LABELS,
  effectiveTarget,
  getOutputPath,
  updatePreExportSummary,
} from "./ui-render-helpers";

export function renderFrameRow(
  frame: FramePreviewItem,
  currentFrames: FramePreviewItem[],
  onCopySection?: (frame: FramePreviewItem) => void
): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "preview-item";
  li.dataset.frameId = frame.id;

  const topRow = document.createElement("div");
  topRow.className = "preview-item-top";

  const target = effectiveTarget(frame);

  const refreshTargetUI = (): void => {
    const nextTarget = effectiveTarget(frame);
    badge.className = `badge ${TARGET_BADGE_COLORS[nextTarget.type]}`;
    badge.textContent = TARGET_LABELS[nextTarget.type];
    keySpan.textContent = `→ ${getOutputPath(nextTarget)}`;
    sel.value = getTargetOverride(frame.id) ?? "auto";
    updatePreExportSummary(currentFrames);
  };

  const badge = document.createElement("span");
  badge.className = `badge ${TARGET_BADGE_COLORS[target.type]}`;
  badge.textContent = TARGET_LABELS[target.type];
  topRow.appendChild(badge);

  const nameSpan = document.createElement("span");
  nameSpan.className = "preview-name";
  nameSpan.textContent = frame.name.length > 36 ? frame.name.slice(0, 36) + "…" : frame.name;
  nameSpan.title = frame.name;
  topRow.appendChild(nameSpan);

  if (frame.responsivePairKey) {
    const respBadge = document.createElement("span");
    respBadge.className = "badge badge-teal responsive-badge";
    respBadge.textContent = "Responsive";
    respBadge.title = "This entry is a merged desktop + mobile responsive pair";
    topRow.appendChild(respBadge);
  }

  const errorCount = frame.issues.filter((i) => i.severity === "error").length;
  const warnCount = frame.issues.filter((i) => i.severity === "warn").length;
  if (errorCount > 0 || warnCount > 0) {
    const issueBadge = document.createElement("span");
    issueBadge.className = "issue-badge";
    const parts: string[] = [];
    if (errorCount > 0) parts.push(`🔴 ${errorCount}`);
    if (warnCount > 0) parts.push(`🟡 ${warnCount}`);
    issueBadge.textContent = parts.join(" ");
    topRow.appendChild(issueBadge);
  }

  const hasStructureIssues = frame.issues.some((issue) => issue.category === "structure");
  if (hasStructureIssues) {
    const presetHint = document.createElement("button");
    presetHint.type = "button";
    presetHint.className = "structure-hint-btn";
    presetHint.textContent = "Use Section";
    presetHint.title = "Quick suggestion: treat this frame as a section";
    presetHint.addEventListener("click", () => {
      setTargetOverride(frame.id, "preset");
      refreshTargetUI();
    });
    topRow.appendChild(presetHint);
  }

  const sel = document.createElement("select");
  sel.className = "target-override-select";
  sel.setAttribute("aria-label", `Export target for ${frame.name}`);

  const overrideOptions: Array<{ value: string; label: string }> = [
    { value: "auto", label: `Auto (${TARGET_LABELS[frame.target.type]})` },
    { value: "page", label: "Page" },
    { value: "preset", label: "Section" },
    { value: "modal", label: "Modal" },
    { value: "module", label: "Module" },
    { value: "button", label: "Button" },
    { value: "background", label: "Background" },
    { value: "global", label: "Global Element" },
    { value: "skip", label: "Skip" },
  ];

  const savedOverride = getTargetOverride(frame.id) ?? "auto";
  for (const opt of overrideOptions) {
    const optEl = document.createElement("option");
    optEl.value = opt.value;
    optEl.textContent = opt.label;
    if (opt.value === savedOverride) optEl.selected = true;
    sel.appendChild(optEl);
  }

  const keySpan = document.createElement("span");
  keySpan.className = "preview-key";
  keySpan.textContent = `→ ${getOutputPath(target)}`;

  sel.addEventListener("change", () => {
    setTargetOverride(frame.id, sel.value);
    refreshTargetUI();
  });

  topRow.appendChild(sel);

  const supportsSectionCopy = target.type !== "skip";
  if (supportsSectionCopy && onCopySection) {
    const copySectionBtn = document.createElement("button");
    copySectionBtn.type = "button";
    copySectionBtn.className = "copy-section-btn";
    copySectionBtn.textContent = "Copy section";
    copySectionBtn.title =
      "Export this frame as a section artifact (section JSON + index patch metadata)";
    copySectionBtn.addEventListener("click", () => {
      onCopySection(frame);
    });
    topRow.appendChild(copySectionBtn);
  }

  const cdnRow = document.createElement("div");
  cdnRow.className = "cdn-prefix-row";
  const cdnLabel = document.createElement("label");
  cdnLabel.textContent = "CDN prefix:";
  const cdnInput = document.createElement("input");
  cdnInput.type = "text";
  cdnInput.className = "cdn-prefix-input";
  cdnInput.placeholder = "e.g. work/my-project/";
  cdnInput.autocomplete = "off";
  cdnInput.spellcheck = false;
  cdnInput.value = getCdnPrefixOverride(frame.id);
  cdnInput.addEventListener("input", () => {
    setCdnPrefixOverride(frame.id, cdnInput.value.trim());
  });
  cdnRow.appendChild(cdnLabel);
  cdnRow.appendChild(cdnInput);

  li.appendChild(topRow);
  li.appendChild(keySpan);
  li.appendChild(cdnRow);

  if (frame.issues.length > 0) {
    li.appendChild(buildIssuesList(frame));
  }

  li.appendChild(buildAdvancedOptions(frame));

  return li;
}

function buildIssuesList(frame: FramePreviewItem): HTMLDetailsElement {
  const issueDetails = document.createElement("details");
  issueDetails.className = "frame-issues";

  const issueSummary = document.createElement("summary");
  issueSummary.className = "frame-issues-summary";
  issueSummary.textContent = `${frame.issues.length} issue${frame.issues.length !== 1 ? "s" : ""}`;
  issueDetails.appendChild(issueSummary);

  const issueList = document.createElement("ul");
  issueList.className = "frame-issues-list";
  for (const issue of frame.issues) {
    const issLi = document.createElement("li");
    issLi.className = `frame-issue frame-issue--${issue.severity}`;
    issLi.textContent = issue.message;
    issueList.appendChild(issLi);
  }
  issueDetails.appendChild(issueList);
  return issueDetails;
}

function buildAdvancedOptions(frame: FramePreviewItem): HTMLDetailsElement {
  const advDetails = document.createElement("details");
  advDetails.className = "frame-adv-options";

  const advSummary = document.createElement("summary");
  advSummary.className = "frame-adv-summary";
  advSummary.textContent = "Advanced options";
  advDetails.appendChild(advSummary);

  const advBody = document.createElement("div");
  advBody.className = "frame-adv-body";

  const savedAnn = getAnnotationOverrides(frame.id);

  advBody.appendChild(buildCheckboxOption(frame.id, "sticky", savedAnn, " Sticky header"));
  advBody.appendChild(buildCheckboxOption(frame.id, "hidden", savedAnn, " Hidden initially"));

  const overflowLabel = document.createElement("label");
  overflowLabel.className = "adv-option adv-option--select";
  overflowLabel.append("Overflow: ");
  const overflowSel = document.createElement("select");
  overflowSel.className = "adv-select";
  for (const v of ["visible", "hidden", "auto", "scroll"]) {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    if ((savedAnn["overflow"] ?? "visible") === v) o.selected = true;
    overflowSel.appendChild(o);
  }
  overflowSel.addEventListener("change", () => {
    setAnnotationOverride(frame.id, "overflow", overflowSel.value);
  });
  overflowLabel.appendChild(overflowSel);
  advBody.appendChild(overflowLabel);

  advDetails.appendChild(advBody);
  return advDetails;
}

function buildCheckboxOption(
  frameId: string,
  key: string,
  savedAnn: Record<string, string>,
  labelText: string
): HTMLLabelElement {
  const label = document.createElement("label");
  label.className = "adv-option";
  const check = document.createElement("input");
  check.type = "checkbox";
  check.checked = savedAnn[key] === "true";
  check.addEventListener("change", () => {
    setAnnotationOverride(frameId, key, check.checked ? "true" : "false");
  });
  label.appendChild(check);
  label.append(labelText);
  return label;
}

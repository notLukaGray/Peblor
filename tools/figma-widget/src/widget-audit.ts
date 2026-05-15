import {
  parseExportTargetFromLayerName,
  getLayerPrefixDiagnostics,
} from "../../figma-bridge/src/index";
import type { FrameAuditRow } from "./widget";

/**
 * Scans all top-level FRAME nodes on the current page and returns audit rows.
 * Resolves responsive pairing for Section[Desktop]/* and Section[Mobile]/* frames.
 * Called from the widget's Scan button click handler.
 */
export function scanPageFrames(): FrameAuditRow[] {
  const rows: FrameAuditRow[] = [];

  for (const node of figma.currentPage.children) {
    if (node.type !== "FRAME") continue;
    const parsed = parseExportTargetFromLayerName(node.name);
    const prefixWarnings = getLayerPrefixDiagnostics(node.name);
    rows.push({
      frameId: node.id,
      frameName: node.name,
      exportKind: parsed.kind,
      exportKey: parsed.key,
      prefixWarnings,
      responsiveRole: parsed.responsiveRole ?? null,
      pairStatus: "n/a",
    });
  }

  // Resolve responsive pairs: group preset rows by exportKey per role
  const desktopByKey = new Map<string, FrameAuditRow>();
  const mobileByKey = new Map<string, FrameAuditRow>();

  for (const row of rows) {
    if (row.exportKind !== "preset") continue;
    if (row.responsiveRole === "desktop") {
      addResponsiveRowWithCollisionHandling(desktopByKey, row, "desktop");
    } else if (row.responsiveRole === "mobile") {
      addResponsiveRowWithCollisionHandling(mobileByKey, row, "mobile");
    }
  }

  for (const row of rows) {
    if (row.exportKind !== "preset" || row.responsiveRole === null) continue;
    const partnerMap = row.responsiveRole === "desktop" ? mobileByKey : desktopByKey;
    const partner = partnerMap.get(row.exportKey);
    if (partner) {
      row.pairStatus = "paired";
      row.pairedWithName = partner.frameName;
    } else {
      row.pairStatus = "orphan";
    }
  }

  return rows;
}

function addResponsiveRowWithCollisionHandling(
  rowsByKey: Map<string, FrameAuditRow>,
  row: FrameAuditRow,
  role: "desktop" | "mobile"
): void {
  const existing = rowsByKey.get(row.exportKey);
  if (!existing) {
    rowsByKey.set(row.exportKey, row);
    return;
  }

  row.prefixWarnings = [
    ...row.prefixWarnings,
    `[responsive] Duplicate Section[${role === "desktop" ? "Desktop" : "Mobile"}]/${row.exportKey} frame key; pairing keeps "${existing.frameName}" and ignores this duplicate.`,
  ];
}

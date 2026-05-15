import type { FrameAuditRow } from "./widget";

// ── Design tokens ─────────────────────────────────────────────────────────────

const SURFACE = "#242424";
const SURFACE2 = "#2E2E2E";
const BORDER = "#333333";
const TEXT_PRIMARY = "#F0F0F0";
const TEXT_DIM = "#777777";
const GREEN = "#47FF8A";
const YELLOW = "#FFA340";

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowStatus(row: FrameAuditRow): "ok" | "warn" {
  if (row.pairStatus === "orphan") return "warn";
  if (row.prefixWarnings.length > 0) return "warn";
  return "ok";
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface AuditTabProps {
  rows: FrameAuditRow[];
  lastScannedPageName: string;
  onScan: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AuditTab({ rows, lastScannedPageName, onScan }: AuditTabProps) {
  const { widget } = figma;
  const { AutoLayout, Text } = widget;

  const warnCount = rows.filter((r) => rowStatus(r) === "warn").length;
  const summaryText =
    rows.length > 0
      ? `${rows.length} frame${rows.length === 1 ? "" : "s"} · ${warnCount} warning${warnCount === 1 ? "" : "s"}`
      : lastScannedPageName !== ""
        ? "0 frames"
        : "Not scanned yet";

  return (
    <AutoLayout direction="vertical" width="fill-parent" spacing={6}>
      {/* Top bar */}
      <AutoLayout
        direction="horizontal"
        width="fill-parent"
        verticalAlignItems="center"
        spacing={8}
      >
        <AutoLayout
          padding={{ vertical: 4, horizontal: 10 }}
          cornerRadius={4}
          fill={SURFACE2}
          onClick={onScan}
        >
          <Text fontSize={10} fill={TEXT_PRIMARY}>
            Scan
          </Text>
        </AutoLayout>
        <Text fontSize={10} fill={TEXT_DIM} width="fill-parent">
          {summaryText}
        </Text>
      </AutoLayout>

      {/* Empty state */}
      {rows.length === 0 && lastScannedPageName === "" && (
        <AutoLayout padding={{ vertical: 10 }} width="fill-parent">
          <Text fontSize={10} fill={TEXT_DIM} width="fill-parent">
            Hit Scan to audit this page
          </Text>
        </AutoLayout>
      )}

      {/* Frame list */}
      {rows.map((row) => {
        const status = rowStatus(row);
        const dotColor = status === "ok" ? GREEN : YELLOW;

        return (
          <AutoLayout
            key={row.frameId}
            direction="vertical"
            width="fill-parent"
            padding={{ vertical: 6, horizontal: 8 }}
            cornerRadius={6}
            fill={SURFACE}
            spacing={3}
          >
            {/* Main row */}
            <AutoLayout
              direction="horizontal"
              width="fill-parent"
              verticalAlignItems="center"
              spacing={6}
            >
              {/* Status dot */}
              <AutoLayout width={6} height={6} cornerRadius={3} fill={dotColor} />

              {/* Kind badge + key */}
              <AutoLayout
                direction="horizontal"
                width="fill-parent"
                verticalAlignItems="center"
                spacing={5}
              >
                <AutoLayout padding={{ vertical: 1, horizontal: 4 }} cornerRadius={3} fill={BORDER}>
                  <Text fontSize={8} fill={TEXT_DIM}>
                    {row.exportKind}
                  </Text>
                </AutoLayout>
                <Text fontSize={10} fill={TEXT_PRIMARY} width="fill-parent">
                  {row.exportKey !== "" ? row.exportKey : "(no key)"}
                </Text>
              </AutoLayout>

              {/* Right annotations */}
              <AutoLayout direction="horizontal" spacing={4} verticalAlignItems="center">
                {row.responsiveRole !== null && (
                  <Text fontSize={9} fill={TEXT_DIM}>
                    {row.responsiveRole}
                  </Text>
                )}
                {row.pairStatus === "orphan" && (
                  <Text fontSize={9} fill={YELLOW}>
                    no pair
                  </Text>
                )}
                {row.prefixWarnings.length > 0 && (
                  <Text fontSize={9} fill={YELLOW}>
                    ⚠
                  </Text>
                )}
              </AutoLayout>
            </AutoLayout>

            {/* Frame name (truncated via fixed width) */}
            <AutoLayout width="fill-parent" overflow="hidden">
              <Text fontSize={8} fill={TEXT_DIM} width={260} truncate>
                {row.frameName}
              </Text>
            </AutoLayout>
          </AutoLayout>
        );
      })}
    </AutoLayout>
  );
}

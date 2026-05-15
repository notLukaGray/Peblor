import { inspectUnified } from "./rules";
import type { WidgetState } from "./widget";
import { INITIAL_WIDGET_STATE, buildInspectableNodePayload, buildInspectContext } from "./widget";
import { scanPageFrames } from "./widget-audit";
import { AuditTab } from "./widget-tab-audit";
import { KeysTab } from "./widget-tab-keys";

const { widget } = figma;
const { AutoLayout, Text, useSyncedState, useEffect } = widget;

// ── Design tokens ─────────────────────────────────────────────────────────────

const BG = "#1A1A1A";
const SURFACE2 = "#2E2E2E";
const BORDER = "#333333";
const TEXT_PRIMARY = "#F0F0F0";
const TEXT_DIM = "#777777";

// ── Widget ─────────────────────────────────────────────────────────────────────

function PeblorWidget() {
  const [state, setState] = useSyncedState<WidgetState>("pb-widget-v2", INITIAL_WIDGET_STATE);

  // Selection-reactive inspector footer.
  // Guard: only call setState when values actually changed — calling it
  // unconditionally on every render creates a setState→render→effect→setState loop.
  useEffect(() => {
    function refresh() {
      const sel = figma.currentPage.selection;

      if (!sel.length) {
        if (
          state.inspectedNodeName === "" &&
          state.inspectedExportKind === "" &&
          state.inspectedExportKey === ""
        )
          return;
        setState({
          ...state,
          inspectedNodeName: "",
          inspectedExportKind: "",
          inspectedExportKey: "",
        });
        return;
      }

      const node = sel[0]!;
      const snap = buildInspectableNodePayload(node);
      const ctx = buildInspectContext(node);
      const result = inspectUnified(snap, ctx);
      const newName = node.name;
      const newKind = result.exportPreview.parsedTargetKind;
      const newKey = result.exportPreview.exportKey;

      if (
        newName === state.inspectedNodeName &&
        newKind === state.inspectedExportKind &&
        newKey === state.inspectedExportKey
      )
        return;
      setState({
        ...state,
        inspectedNodeName: newName,
        inspectedExportKind: newKind,
        inspectedExportKey: newKey,
      });
    }

    figma.on("selectionchange", refresh);
    refresh();
    return () => figma.off("selectionchange", refresh);
  });

  return (
    <AutoLayout
      direction="vertical"
      width={300}
      padding={14}
      spacing={0}
      cornerRadius={10}
      fill={BG}
      stroke={BORDER}
      strokeWidth={1}
    >
      {/* Header: title + tab switcher */}
      <AutoLayout
        direction="horizontal"
        width="fill-parent"
        verticalAlignItems="center"
        spacing={6}
        padding={{ bottom: 10 }}
      >
        <Text fontSize={12} fontWeight="bold" fill={TEXT_PRIMARY} width="fill-parent">
          Page Builder
        </Text>
        {(["audit", "keys"] as const).map((tab) => (
          <AutoLayout
            key={tab}
            padding={{ vertical: 3, horizontal: 8 }}
            cornerRadius={4}
            fill={state.activeTab === tab ? SURFACE2 : ("transparent" as const)}
            onClick={() => setState({ ...state, activeTab: tab })}
          >
            <Text fontSize={10} fill={state.activeTab === tab ? TEXT_PRIMARY : TEXT_DIM}>
              {tab === "audit" ? "Audit" : "Keys"}
            </Text>
          </AutoLayout>
        ))}
      </AutoLayout>

      {/* Divider */}
      <AutoLayout width="fill-parent" height={1} fill={BORDER} />

      {/* Tab content */}
      <AutoLayout direction="vertical" width="fill-parent" padding={{ top: 10 }} spacing={0}>
        {state.activeTab === "audit" ? (
          <AuditTab
            rows={state.auditRows}
            lastScannedPageName={state.lastScannedPageName}
            onScan={() => {
              const rows = scanPageFrames();
              setState({ ...state, auditRows: rows, lastScannedPageName: figma.currentPage.name });
            }}
          />
        ) : (
          <KeysTab
            filter={state.keyFilter}
            scope={state.keyScope}
            onFilterChange={(v) => setState({ ...state, keyFilter: v })}
            onScopeChange={(s) => setState({ ...state, keyScope: s })}
          />
        )}
      </AutoLayout>

      {/* Inspector footer — only shown when a node is selected */}
      {state.inspectedNodeName !== "" && (
        <>
          <AutoLayout width="fill-parent" height={1} fill={BORDER} />
          <AutoLayout direction="vertical" width="fill-parent" spacing={2} padding={{ top: 8 }}>
            <Text fontSize={9} fontWeight="bold" fill={TEXT_DIM} letterSpacing={1}>
              SELECTED
            </Text>
            <Text fontSize={10} fill={TEXT_PRIMARY} width="fill-parent">
              {state.inspectedNodeName}
            </Text>
            <Text fontSize={9} fill={TEXT_DIM}>
              {state.inspectedExportKind} · {state.inspectedExportKey}
            </Text>
          </AutoLayout>
        </>
      )}
    </AutoLayout>
  );
}

figma.widget.register(PeblorWidget);

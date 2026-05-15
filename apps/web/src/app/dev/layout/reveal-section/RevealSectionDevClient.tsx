"use client";

import { useMemo, useState } from "react";
import type { SectionBlock } from "@pb/contracts";
import {
  BooleanField,
  Field,
  SectionPreview,
  SectionWorkbenchLayout,
  controlClassName,
} from "@/app/dev/layout/_shared/section-type-workbench";

type RevealMode = "hover" | "click" | "button" | "external" | "combined";
type ExpandAxis = "vertical" | "horizontal" | "both";

const MODES: RevealMode[] = ["click", "hover", "combined", "external", "button"];
const AXES: ExpandAxis[] = ["vertical", "horizontal", "both"];
const PRESETS = ["fade", "slideUp", "slideDown", "slideLeft", "slideRight", "zoomIn"];

function buildSection({
  triggerMode,
  initialRevealed,
  revealPreset,
  expandAxis,
  externalTriggerKey,
  expandDurationMs,
}: {
  triggerMode: RevealMode;
  initialRevealed: boolean;
  revealPreset: string;
  expandAxis: ExpandAxis;
  externalTriggerKey: string;
  expandDurationMs: number;
}): SectionBlock {
  return {
    type: "revealSection",
    id: "reveal_section_workbench",
    ariaLabel: "Reveal section workbench",
    width: "100%",
    height: "hug",
    align: "center",
    fill: "rgba(21, 94, 117, 0.42)",
    borderRadius: "0.5rem",
    border: { color: "rgba(255,255,255,0.18)", width: "1px", style: "solid" },
    marginTop: "1rem",
    marginBottom: "1rem",
    triggerMode,
    initialRevealed,
    revealOnHover: triggerMode === "hover" || triggerMode === "combined",
    revealOnClick: triggerMode === "click" || triggerMode === "combined",
    toggleOnClick: true,
    externalTriggerKey,
    externalTriggerMode: "toggle",
    expandAxis,
    expandDurationMs,
    collapseDurationMs: expandDurationMs,
    transitionEasing: "easeInOut",
    revealPreset,
    revealStaggerMs: 70,
    revealDurationMs: 260,
    collapsedElements: [
      {
        type: "elementHeading",
        text: "Reveal Section",
        level: 2,
        width: "100%",
        textAlign: "center",
        wordWrap: true,
      },
      {
        type: "elementBody",
        text: "Click or hover based on the active trigger mode.",
        level: 4,
        width: "100%",
        textAlign: "center",
        wordWrap: true,
      },
    ],
    revealedElements: [
      {
        type: "elementBody",
        text: `Nested content ref: ${externalTriggerKey}`,
        level: 3,
        width: "100%",
        textAlign: "center",
        wordWrap: true,
        marginTop: "1rem",
      },
      {
        type: "elementButton",
        label: "Revealed action",
        variant: "ghost",
        align: "center",
        marginTop: "0.75rem",
      },
    ],
  } as SectionBlock;
}

export function RevealSectionDevClient() {
  const [triggerMode, setTriggerMode] = useState<RevealMode>("click");
  const [initialRevealed, setInitialRevealed] = useState(false);
  const [revealPreset, setRevealPreset] = useState("slideUp");
  const [expandAxis, setExpandAxis] = useState<ExpandAxis>("vertical");
  const [externalTriggerKey, setExternalTriggerKey] = useState("workbenchReveal");
  const [expandDurationMs, setExpandDurationMs] = useState(320);
  const section = useMemo(
    () =>
      buildSection({
        triggerMode,
        initialRevealed,
        revealPreset,
        expandAxis,
        externalTriggerKey,
        expandDurationMs,
      }),
    [triggerMode, initialRevealed, revealPreset, expandAxis, externalTriggerKey, expandDurationMs]
  );

  return (
    <SectionWorkbenchLayout
      eyebrow="Dev · Layout"
      title="Reveal Section"
      description="Tune reveal conditions, animation presets, expand axis, and nested revealed content."
      affects="revealSection trigger modes, collapsed/revealed elements, animation preset, and external trigger wiring"
      section={section}
      onReset={() => {
        setTriggerMode("click");
        setInitialRevealed(false);
        setRevealPreset("slideUp");
        setExpandAxis("vertical");
        setExternalTriggerKey("workbenchReveal");
        setExpandDurationMs(320);
      }}
      preview={<SectionPreview section={section} />}
      controls={
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Reveal condition">
            <select
              value={triggerMode}
              onChange={(event) => setTriggerMode(event.target.value as RevealMode)}
              className={controlClassName()}
            >
              {MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Animation preset">
            <select
              value={revealPreset}
              onChange={(event) => setRevealPreset(event.target.value)}
              className={controlClassName()}
            >
              {PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Expand axis">
            <select
              value={expandAxis}
              onChange={(event) => setExpandAxis(event.target.value as ExpandAxis)}
              className={controlClassName()}
            >
              {AXES.map((axis) => (
                <option key={axis} value={axis}>
                  {axis}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nested section ref">
            <input
              value={externalTriggerKey}
              onChange={(event) => setExternalTriggerKey(event.target.value)}
              className={controlClassName()}
            />
          </Field>
          <Field label="Duration ms">
            <input
              type="number"
              min={0}
              value={expandDurationMs}
              onChange={(event) => setExpandDurationMs(Number(event.target.value))}
              className={controlClassName()}
            />
          </Field>
          <BooleanField
            label="Initially revealed"
            checked={initialRevealed}
            onChange={setInitialRevealed}
          />
        </div>
      }
    />
  );
}

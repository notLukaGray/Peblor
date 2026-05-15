"use client";

import { useMemo, useState } from "react";
import type { SectionBlock } from "@pb/contracts";
import {
  Field,
  SectionPreview,
  SectionWorkbenchLayout,
  controlClassName,
} from "@/app/dev/layout/_shared/section-type-workbench";

function buildSection({
  fill,
  height,
  width,
  marginTop,
  marginBottom,
  radius,
}: {
  fill: string;
  height: string;
  width: string;
  marginTop: string;
  marginBottom: string;
  radius: string;
}): SectionBlock {
  return {
    type: "divider",
    id: "section_divider_workbench",
    ariaLabel: "Section divider workbench",
    width,
    height,
    align: "center",
    fill,
    borderRadius: radius,
    marginTop,
    marginBottom,
    border: { color: "rgba(255,255,255,0.16)", width: "1px", style: "solid" },
  } as SectionBlock;
}

export function SectionDividerDevClient() {
  const [fill, setFill] = useState("linear-gradient(90deg, transparent, #22d3ee, transparent)");
  const [height, setHeight] = useState("4px");
  const [width, setWidth] = useState("80%");
  const [marginTop, setMarginTop] = useState("2rem");
  const [marginBottom, setMarginBottom] = useState("2rem");
  const [radius, setRadius] = useState("9999px");
  const section = useMemo(
    () => buildSection({ fill, height, width, marginTop, marginBottom, radius }),
    [fill, height, width, marginTop, marginBottom, radius]
  );

  return (
    <SectionWorkbenchLayout
      eyebrow="Dev · Layout"
      title="Divider Section"
      description="Edit the standalone section divider variant and render it through the production section renderer."
      affects="divider sections, section fill, height, width, margins, radius, border, and section-level base styling"
      section={section}
      onReset={() => {
        setFill("linear-gradient(90deg, transparent, #22d3ee, transparent)");
        setHeight("4px");
        setWidth("80%");
        setMarginTop("2rem");
        setMarginBottom("2rem");
        setRadius("9999px");
      }}
      preview={<SectionPreview section={section} />}
      controls={
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fill">
            <input
              value={fill}
              onChange={(event) => setFill(event.target.value)}
              className={controlClassName()}
            />
          </Field>
          <Field label="Height">
            <input
              value={height}
              onChange={(event) => setHeight(event.target.value)}
              className={controlClassName()}
            />
          </Field>
          <Field label="Width">
            <input
              value={width}
              onChange={(event) => setWidth(event.target.value)}
              className={controlClassName()}
            />
          </Field>
          <Field label="Radius">
            <input
              value={radius}
              onChange={(event) => setRadius(event.target.value)}
              className={controlClassName()}
            />
          </Field>
          <Field label="Margin top">
            <input
              value={marginTop}
              onChange={(event) => setMarginTop(event.target.value)}
              className={controlClassName()}
            />
          </Field>
          <Field label="Margin bottom">
            <input
              value={marginBottom}
              onChange={(event) => setMarginBottom(event.target.value)}
              className={controlClassName()}
            />
          </Field>
        </div>
      }
    />
  );
}

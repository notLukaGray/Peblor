"use client";

import { useMemo, useState } from "react";
import type { SectionBlock } from "@pb/contracts";
import {
  Field,
  SectionPreview,
  SectionWorkbenchLayout,
  controlClassName,
} from "@/app/dev/layout/_shared/section-type-workbench";
import { FormFieldComposer, type AnyField } from "./FormFieldComposer";
import { getFieldDefaults } from "./form-field-defaults";

const DEFAULT_FIELDS: AnyField[] = [
  {
    ...getFieldDefaults("text"),
    name: "name",
    label: "Full name",
    placeholder: "Jane Designer",
    required: true,
  } as unknown as AnyField,
  {
    ...getFieldDefaults("email"),
    name: "email",
    label: "Work email",
    placeholder: "jane@studio.com",
    required: true,
  } as unknown as AnyField,
  {
    ...getFieldDefaults("paragraph"),
    name: "message",
    label: "What should we build?",
    placeholder: "Tell us about your project…",
    rows: 5,
  } as unknown as AnyField,
  {
    ...getFieldDefaults("button"),
    label: "Send message",
    loadingText: "Sending…",
  } as unknown as AnyField,
];

const CONTENT_WIDTH_OPTIONS = ["28rem", "36rem", "44rem", "full", "hug"] as const;
type ContentWidthOption = (typeof CONTENT_WIDTH_OPTIONS)[number];

function buildSection(
  fields: AnyField[],
  action: string,
  method: "get" | "post",
  fill: string,
  contentWidth: ContentWidthOption
): SectionBlock {
  return {
    type: "formBlock",
    id: "form_block_workbench",
    ariaLabel: "Form block workbench",
    width: "100%",
    height: "hug",
    fill,
    borderRadius: "0.75rem",
    border: { color: "rgba(255,255,255,0.10)", width: "1px", style: "solid" },
    paddingTop: "2.5rem",
    paddingBottom: "2.5rem",
    paddingLeft: "2rem",
    paddingRight: "2rem",
    marginTop: "1rem",
    marginBottom: "1rem",
    contentWidth,
    action: action || undefined,
    method,
    fields,
  } as SectionBlock;
}

export function FormBlockDevClient() {
  const [fields, setFields] = useState<AnyField[]>(DEFAULT_FIELDS);
  const [action, setAction] = useState("");
  const [method, setMethod] = useState<"get" | "post">("post");
  const [fill, setFill] = useState("rgba(30, 38, 54, 1)");
  const [contentWidth, setContentWidth] = useState<ContentWidthOption>("36rem");

  const section = useMemo(
    () => buildSection(fields, action, method, fill, contentWidth),
    [fields, action, method, fill, contentWidth]
  );

  return (
    <SectionWorkbenchLayout
      eyebrow="Dev · Layout"
      title="Form Block"
      description="Compose form fields live — add, reorder, and edit per-field props. The full form renders below using production components."
      affects="formBlock fields, contentWidth, action/method, fill, border"
      section={section}
      onReset={() => {
        setFields(DEFAULT_FIELDS);
        setAction("");
        setMethod("post");
        setFill("rgba(30, 38, 54, 1)");
        setContentWidth("36rem");
      }}
      preview={<SectionPreview section={section} />}
      controls={
        <div className="space-y-5">
          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              Fields
            </p>
            <FormFieldComposer fields={fields} onChange={setFields} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 border-t border-border pt-5">
            <Field label="Content width">
              <select
                value={contentWidth}
                onChange={(e) => setContentWidth(e.target.value as ContentWidthOption)}
                className={controlClassName()}
              >
                {CONTENT_WIDTH_OPTIONS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Method">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as "get" | "post")}
                className={controlClassName()}
              >
                <option value="post">post</option>
                <option value="get">get</option>
              </select>
            </Field>
            <Field label="Action endpoint">
              <input
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="/api/forms/contact"
                className={controlClassName()}
              />
            </Field>
            <Field label="Fill">
              <input
                value={fill}
                onChange={(e) => setFill(e.target.value)}
                className={controlClassName()}
              />
            </Field>
          </div>
        </div>
      }
    />
  );
}

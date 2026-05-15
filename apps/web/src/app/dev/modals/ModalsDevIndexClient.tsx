"use client";

import { useMemo, useState } from "react";
import type { ModalBuilder, SectionBlock } from "@pb/contracts";
import { modalBuilderSchema } from "@pb/contracts/peblor/core/peblor-schemas/modal-block-schemas";
import { ModalRenderer } from "@pb/runtime-react/client";
import { DeviceTypeProvider } from "@pb/runtime-react/core/providers/device-type-provider";
import { DevWorkbenchNav } from "@/app/dev/_components/DevWorkbenchNav";
import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";
import { DevWorkbenchPageShell } from "@/app/dev/_components/DevWorkbenchPageShell";
import { ModalsDevControls } from "./ModalsDevControls";

export type SectionKey = "intro" | "form" | "footer";

const SECTION_KEYS: SectionKey[] = ["intro", "form", "footer"];

function buildDefinitions(title: string): ModalBuilder["definitions"] {
  return {
    intro: {
      type: "contentBlock",
      id: "modal_intro",
      height: "hug",
      elements: [
        {
          type: "elementHeading",
          text: title,
          level: 2,
          textAlign: "center",
          width: "100%",
          wordWrap: true,
        },
        {
          type: "elementBody",
          text: "This modal document is rendered with production modal sections.",
          level: 4,
          textAlign: "center",
          width: "100%",
          wordWrap: true,
        },
      ],
    },
    form: {
      type: "formBlock",
      id: "modal_form",
      height: "hug",
      contentWidth: "full",
      fields: [
        {
          type: "formField",
          fieldType: "email",
          name: "email",
          label: "Email",
          placeholder: "you@example.com",
          level: 3,
        },
        { type: "formField", fieldType: "submit", label: "Join" },
      ],
    },
    footer: {
      type: "contentBlock",
      id: "modal_footer",
      height: "hug",
      elements: [
        {
          type: "elementBody",
          text: "Section order and definitions are editable in the composer.",
          level: 5,
          textAlign: "center",
          width: "100%",
          wordWrap: true,
        },
      ],
    },
  };
}

function buildModalDoc(
  title: string,
  sectionOrder: SectionKey[],
  enterDurationMs: number,
  exitDurationMs: number,
  easing: string
): ModalBuilder {
  return {
    id: "modal_workbench",
    title,
    sectionOrder,
    definitions: buildDefinitions(title),
    transition: { enterDurationMs, exitDurationMs, easing },
  } as ModalBuilder;
}

function resolveSections(doc: ModalBuilder): SectionBlock[] {
  return doc.sectionOrder
    .map((key) => doc.definitions[key])
    .filter((section): section is SectionBlock => !!section && "type" in section) as SectionBlock[];
}

function SchemaBadge({ doc }: { doc: ModalBuilder }) {
  const parsed = modalBuilderSchema.safeParse(doc);
  return (
    <span
      className={`rounded border px-2 py-1 text-[10px] font-mono ${
        parsed.success
          ? "border-emerald-500/30 text-emerald-300"
          : "border-destructive/40 text-destructive"
      }`}
    >
      {parsed.success ? "schema valid" : "schema error"}
    </span>
  );
}

function dispatchModalEvent(type: "modalOpen" | "modalClose" | "modalToggle") {
  window.dispatchEvent(
    new CustomEvent("peblor-modal", {
      detail: { type, id: "modal_workbench" },
    })
  );
}

export function ModalsDevIndexClient() {
  const [show, setShow] = useState(true);
  const [title, setTitle] = useState("Workbench Modal");
  const [sectionOrder, setSectionOrder] = useState<SectionKey[]>(SECTION_KEYS);
  const [enterDurationMs, setEnterDurationMs] = useState(240);
  const [exitDurationMs, setExitDurationMs] = useState(180);
  const [easing, setEasing] = useState("easeOut");
  const doc = useMemo(
    () => buildModalDoc(title, sectionOrder, enterDurationMs, exitDurationMs, easing),
    [title, sectionOrder, enterDurationMs, exitDurationMs, easing]
  );
  const resolvedSections = useMemo(() => resolveSections(doc), [doc]);

  const triggerModal = (type: "modalOpen" | "modalClose" | "modalToggle") => {
    dispatchModalEvent(type);
    if (type === "modalOpen") setShow(true);
    if (type === "modalClose") setShow(false);
    if (type === "modalToggle") setShow((prev) => !prev);
  };

  return (
    <DevWorkbenchPageShell nav={<DevWorkbenchNav />}>
      <DevWorkbenchPageHeader
        eyebrow="Dev · Builder"
        title="Modals"
        description="Compose a modal document with sectionOrder, definitions, transitions, motion, and open/close preview."
        affects="modal documents, modal section order, definitions, transition timing, and modal trigger behavior"
        showSessionBadge
      />
      <div className="mb-4 flex justify-end">
        <SchemaBadge doc={doc} />
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)]">
        <section className="space-y-5">
          <div className="relative h-[34rem] overflow-hidden rounded-lg border border-border bg-card/20 p-4">
            <DeviceTypeProvider>
              <ModalRenderer
                id={doc.id}
                title={doc.title}
                resolvedSections={resolvedSections}
                transition={doc.transition}
                show={show}
                onOverlayClick={() => setShow(false)}
                overlayClassName="absolute inset-4 z-20 flex items-center justify-center rounded-lg bg-black/70 p-4 backdrop-blur-sm"
                dialogClassName="w-full max-w-md max-h-[28rem] overflow-y-auto rounded-lg border border-border bg-background p-5 shadow-xl"
              />
              {!show ? (
                <div className="grid h-full place-items-center rounded border border-dashed border-border/70 text-sm text-muted-foreground">
                  Modal closed
                </div>
              ) : null}
            </DeviceTypeProvider>
          </div>
          <section className="rounded-lg border border-border bg-card/20 p-4">
            <ModalsDevControls
              title={title}
              setTitle={setTitle}
              sectionOrder={sectionOrder}
              setSectionOrder={setSectionOrder}
              enterDurationMs={enterDurationMs}
              setEnterDurationMs={setEnterDurationMs}
              exitDurationMs={exitDurationMs}
              setExitDurationMs={setExitDurationMs}
              easing={easing}
              setEasing={setEasing}
              triggerModal={triggerModal}
            />
          </section>
        </section>
        <aside className="space-y-4 rounded-lg border border-border bg-card/20 p-4">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Modal JSON
          </p>
          <pre className="max-h-[42rem] overflow-auto rounded border border-border bg-background p-3 text-[11px] leading-5 text-muted-foreground">
            {JSON.stringify(doc, null, 2)}
          </pre>
        </aside>
      </div>
    </DevWorkbenchPageShell>
  );
}

import { ELEMENT_DEV_ENTRY_SEEDS } from "@/app/dev/elements/element-dev-entry-seeds";

export type ElementDevBatchId =
  | "batch-1-content"
  | "batch-2-interaction"
  | "batch-3-media"
  | "batch-4-graphics"
  | "batch-5-utility";

export type ElementDevEditor =
  | { kind: "placeholder" }
  | { kind: "styleScope"; scope: "elements-button" | "elements-rich-text" }
  | { kind: "imageVariants" }
  | { kind: "headingDev" }
  | { kind: "bodyDev" }
  | { kind: "buttonDev" }
  | { kind: "richTextDev" }
  | { kind: "linkDev" }
  | { kind: "videoDev" }
  | { kind: "videoTimeDev" }
  | { kind: "vectorDev" }
  | { kind: "svgDev" }
  | { kind: "model3dDev" }
  | { kind: "riveDev" }
  | { kind: "inputDev" }
  | { kind: "rangeDev" }
  | { kind: "spacerDev" }
  | { kind: "dividerDev" }
  | { kind: "groupDev" }
  | { kind: "scrollProgressBarDev" };

export type ElementDevEntry = {
  slug: string;
  type: string;
  navLabel: string;
  title: string;
  description: string;
  note?: string;
  batch: ElementDevBatchId;
  editor: ElementDevEditor;
  status: "live" | "scaffold";
};

export const ELEMENT_DEV_BATCH_META: Record<ElementDevBatchId, { label: string; blurb: string }> = {
  "batch-1-content": {
    label: "Batch 1 · Content",
    blurb: "Heading, body, and link defaults establish the baseline reading system.",
  },
  "batch-2-interaction": {
    label: "Batch 2 · Interaction",
    blurb: "Buttons and form controls define baseline interaction behavior.",
  },
  "batch-3-media": {
    label: "Batch 3 · Media",
    blurb: "Image/video defaults align media presentation and playback behavior.",
  },
  "batch-4-graphics": {
    label: "Batch 4 · Graphics + Motion",
    blurb: "Vector/SVG/3D/Rive defaults govern visual and motion-heavy elements.",
  },
  "batch-5-utility": {
    label: "Batch 5 · Utility",
    blurb: "Supporting utility elements that complete builder ergonomics.",
  },
};

export const ELEMENT_DEV_BATCH_ORDER: ElementDevBatchId[] = [
  "batch-1-content",
  "batch-2-interaction",
  "batch-3-media",
  "batch-4-graphics",
  "batch-5-utility",
];

export type ElementDevEntrySeed = Omit<ElementDevEntry, "editor" | "status"> & {
  editor?: ElementDevEditor;
  status?: ElementDevEntry["status"];
};

function defineEntry(seed: ElementDevEntrySeed): ElementDevEntry {
  return {
    ...seed,
    editor: seed.editor ?? { kind: "placeholder" },
    status: seed.status ?? "scaffold",
  };
}

export const ELEMENT_DEV_ENTRIES: ElementDevEntry[] = ELEMENT_DEV_ENTRY_SEEDS.map(defineEntry);

export function getElementDevEntryBySlug(slug: string): ElementDevEntry | null {
  return ELEMENT_DEV_ENTRIES.find((entry) => entry.slug === slug) ?? null;
}

export function getElementDevPath(slug: string): string {
  return `/dev/elements/${slug}`;
}

export function groupElementDevEntriesByBatch(): Record<ElementDevBatchId, ElementDevEntry[]> {
  return ELEMENT_DEV_ENTRIES.reduce(
    (acc, entry) => {
      acc[entry.batch].push(entry);
      return acc;
    },
    {
      "batch-1-content": [],
      "batch-2-interaction": [],
      "batch-3-media": [],
      "batch-4-graphics": [],
      "batch-5-utility": [],
    } as Record<ElementDevBatchId, ElementDevEntry[]>
  );
}

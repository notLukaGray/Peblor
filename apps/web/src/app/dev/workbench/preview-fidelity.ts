export type PreviewFidelityMode = "raw" | "guided" | "placeholder";

export type PreviewViewportPreset = "desktop" | "tablet" | "mobile";

export type PreviewRendererPath = "ElementRenderer" | "SectionRenderer" | "PeblorRenderer";

export type PreviewSurfaceMetadata = {
  surfaceId: string;
  status: "live" | "wip";
  owner: string;
  rendererPath: PreviewRendererPath;
  fidelityModeDefault: PreviewFidelityMode;
  supportsViewport: boolean;
};

export const PREVIEW_FIDELITY_MODE_LABELS: Record<PreviewFidelityMode, string> = {
  raw: "raw",
  guided: "guided",
  placeholder: "placeholder",
};

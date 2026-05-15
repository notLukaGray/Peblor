"use client";

export const MODEL3D_READY_EVENT = "peblor-model3d-ready";

export type Model3DReadyDetail = {
  elementId?: string;
  authoredId?: string;
};

function toAuthoredId(elementId: string | undefined): string | undefined {
  if (!elementId) return undefined;
  const parts = elementId.split(":");
  return parts[parts.length - 1] || elementId;
}

export function fireModel3DReady(elementId?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<Model3DReadyDetail>(MODEL3D_READY_EVENT, {
      detail: { elementId, authoredId: toAuthoredId(elementId) },
    })
  );
}

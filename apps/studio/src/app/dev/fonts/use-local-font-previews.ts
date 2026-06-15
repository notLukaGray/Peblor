"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type FontDevSlotName,
  type StoredLocalFontFile,
  applyLocalPreviewFontFaces,
  clearLocalPreviewFontFaceStyle,
  clearLocalRolePreviewFontFaces,
  deleteStoredLocalFont,
  inferFontFormat,
  inferWeightStyleFromFileName,
  loadStoredLocalFont,
  saveStoredLocalFont,
} from "./local-font-preview";

export type LocalPreviewFileRuntime = {
  objectUrl: string;
  fileName: string;
  format: ReturnType<typeof inferFontFormat>;
  fontWeight: number;
  fontStyle: "normal" | "italic";
};

export type LocalPreviewRuntime = {
  files: LocalPreviewFileRuntime[];
};

function runtimeFromStored(stored: { files: StoredLocalFontFile[] }): LocalPreviewRuntime {
  const files: LocalPreviewFileRuntime[] = stored.files.map((sf) => {
    const { weight, style } = inferWeightStyleFromFileName(sf.fileName);
    const format = inferFontFormat(sf.fileName);
    const blob = new Blob([sf.buffer], { type: "application/octet-stream" });
    const objectUrl = URL.createObjectURL(blob);
    return { objectUrl, fileName: sf.fileName, format, fontWeight: weight, fontStyle: style };
  });
  return { files };
}

function revokeSlotRuntime(p: LocalPreviewRuntime | undefined): void {
  for (const f of p?.files ?? []) URL.revokeObjectURL(f.objectUrl);
}

export function useLocalFontPreviews() {
  const [ready, setReady] = useState(false);
  const [previews, setPreviews] = useState<Partial<Record<FontDevSlotName, LocalPreviewRuntime>>>(
    {}
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const slots: FontDevSlotName[] = ["primary", "secondary", "mono"];
      const loaded: Partial<Record<FontDevSlotName, LocalPreviewRuntime>> = {};

      for (const slot of slots) {
        const stored = await loadStoredLocalFont(slot);
        if (cancelled) {
          for (const p of Object.values(loaded)) revokeSlotRuntime(p);
          return;
        }
        if (!stored?.files.length) continue;
        loaded[slot] = runtimeFromStored(stored);
      }

      if (cancelled) {
        for (const p of Object.values(loaded)) revokeSlotRuntime(p);
        return;
      }

      setPreviews(loaded);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const map: Parameters<typeof applyLocalPreviewFontFaces>[0] = {};
    for (const slot of ["primary", "secondary", "mono"] as FontDevSlotName[]) {
      const slotPreview = previews[slot];
      if (!slotPreview?.files.length) continue;
      map[slot] = slotPreview.files.map((f) => ({
        url: f.objectUrl,
        format: f.format,
        fontWeight: f.fontWeight,
        fontStyle: f.fontStyle,
      }));
    }
    applyLocalPreviewFontFaces(map);
  }, [previews, ready]);

  const previewsRef = useRef(previews);

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => {
    return () => {
      for (const p of Object.values(previewsRef.current)) revokeSlotRuntime(p);
      clearLocalPreviewFontFaceStyle();
      clearLocalRolePreviewFontFaces();
    };
  }, []);

  async function filesToStored(files: File[]): Promise<StoredLocalFontFile[]> {
    const out: StoredLocalFontFile[] = [];
    for (const file of files) {
      if (!file.name) continue;
      const lower = file.name.toLowerCase();
      if (!/\.(woff2|woff|ttf|otf)$/.test(lower)) continue;
      const buffer = await file.arrayBuffer();
      out.push({ fileName: file.name, buffer });
    }
    return out;
  }

  const replaceSlotFiles = useCallback(async (slot: FontDevSlotName, picked: File[]) => {
    const nextFiles = await filesToStored(picked);
    if (nextFiles.length === 0) return;
    await saveStoredLocalFont(slot, { files: nextFiles });

    setPreviews((prev) => {
      revokeSlotRuntime(prev[slot]);
      return { ...prev, [slot]: runtimeFromStored({ files: nextFiles }) };
    });
  }, []);

  const clearSlot = useCallback(async (slot: FontDevSlotName) => {
    await deleteStoredLocalFont(slot);
    setPreviews((prev) => {
      revokeSlotRuntime(prev[slot]);
      const { [slot]: _r, ...rest } = prev;
      return rest;
    });
  }, []);

  const previewActive = useCallback(
    (slot: FontDevSlotName) => Boolean(previews[slot]?.files.length),
    [previews]
  );

  return {
    ready,
    previews,
    replaceSlotFiles,
    clearSlot,
    previewActive,
  };
}

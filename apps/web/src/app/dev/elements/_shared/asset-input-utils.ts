import { useCallback, useEffect, useRef } from "react";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseJsonInput(input: string): { value?: unknown; error?: string } {
  try {
    return { value: JSON.parse(input) as unknown };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON.";
    return { error: message };
  }
}

export async function readTextFile(file: File): Promise<string> {
  return file.text();
}

export function hasAllowedFileExtension(fileName: string, allowedExtensions: string[]): boolean {
  const lower = fileName.toLowerCase();
  return allowedExtensions.some((extension) => lower.endsWith(extension.toLowerCase()));
}

export function toAssetKeyFromFileName(fileName: string, fallback: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").trim();
  const chunks = base
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
  if (chunks.length === 0) return fallback;
  return chunks
    .map((chunk, index) => (index === 0 ? chunk : chunk.charAt(0).toUpperCase() + chunk.slice(1)))
    .join("");
}

export function uniqueRecordKey(keys: string[], baseKey: string): string {
  if (!keys.includes(baseKey)) return baseKey;
  let suffix = 2;
  while (keys.includes(`${baseKey}${suffix}`)) suffix += 1;
  return `${baseKey}${suffix}`;
}

function isBlobUrl(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("blob:");
}

export function useObjectUrlRegistry() {
  const trackedUrls = useRef<Set<string>>(new Set());

  const createTrackedObjectUrl = useCallback((blob: Blob) => {
    const next = URL.createObjectURL(blob);
    trackedUrls.current.add(next);
    return next;
  }, []);

  const revokeTrackedObjectUrl = useCallback((url: string | null | undefined) => {
    if (!isBlobUrl(url)) return;
    if (!trackedUrls.current.has(url)) return;
    URL.revokeObjectURL(url);
    trackedUrls.current.delete(url);
  }, []);

  const replaceTrackedObjectUrl = useCallback(
    (previousUrl: string | null | undefined, blob: Blob) => {
      revokeTrackedObjectUrl(previousUrl);
      return createTrackedObjectUrl(blob);
    },
    [createTrackedObjectUrl, revokeTrackedObjectUrl]
  );

  useEffect(() => {
    const urls = trackedUrls.current;
    return () => {
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
      urls.clear();
    };
  }, []);

  return {
    createTrackedObjectUrl,
    revokeTrackedObjectUrl,
    replaceTrackedObjectUrl,
  };
}

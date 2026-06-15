import type { AudioControlContextValue } from "./AudioControlContext";

type Entry = { id: string; value: AudioControlContextValue };

let active: Entry | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

/** Publish audio control state for sibling controls outside AudioControlContext. */
export function registerBroadcastAudioControl(id: string, value: AudioControlContextValue): void {
  active = { id, value };
  emit();
}

export function unregisterBroadcastAudioControl(id: string): void {
  if (active?.id === id) {
    active = null;
    emit();
  }
}

export function getBroadcastAudioControl(): AudioControlContextValue | null {
  return active?.value ?? null;
}

export function subscribeBroadcastAudioControl(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

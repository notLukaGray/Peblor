const WORKBENCH_SESSION_STORAGE_KEY = "workbench-session-v2";
const WORKBENCH_SESSION_CHANGED_EVENT = "pb-workbench-session-changed";

const listeners = new Set<() => void>();
let teardown: (() => void) | null = null;

function notifyListeners(): void {
  for (const listener of listeners) listener();
}

function ensureRuntimeListeners(): void {
  if (typeof window === "undefined" || teardown != null) return;

  const onStorage = (event: StorageEvent) => {
    if (event.key !== WORKBENCH_SESSION_STORAGE_KEY) return;
    notifyListeners();
  };

  const onChanged = () => notifyListeners();

  window.addEventListener("storage", onStorage);
  window.addEventListener(WORKBENCH_SESSION_CHANGED_EVENT, onChanged);

  teardown = () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(WORKBENCH_SESSION_CHANGED_EVENT, onChanged);
    teardown = null;
  };
}

export function subscribeWorkbenchSessionChanges(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  listeners.add(listener);
  ensureRuntimeListeners();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) teardown?.();
  };
}

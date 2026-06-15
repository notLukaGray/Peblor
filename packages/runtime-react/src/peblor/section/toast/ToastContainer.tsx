"use client";

import { useEffect } from "react";
import { useToastStore, type ToastEntry } from "./use-toast-store";
import { globals } from "@pb/runtime-react/core/lib/globals";

const variantStyles: Record<string, string> = {
  info: "bg-[oklch(0.25_0_0)] text-[oklch(0.95_0_0)] border-[oklch(0.4_0_0)]",
  success: "bg-[oklch(0.25_0.08_145)] text-[oklch(0.95_0.05_145)] border-[oklch(0.45_0.12_145)]",
  error: "bg-[oklch(0.25_0.08_25)] text-[oklch(0.95_0.05_25)] border-[oklch(0.45_0.12_25)]",
  warning: "bg-[oklch(0.25_0.08_75)] text-[oklch(0.95_0.05_75)] border-[oklch(0.45_0.12_75)]",
};

function Toast({ toast }: { toast: ToastEntry }) {
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast.id, toast.durationMs, dismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={() => dismiss(toast.id)}
      className={`flex cursor-pointer items-start gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg transition-all ${variantStyles[toast.variant] ?? variantStyles.info}`}
    >
      {toast.message}
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div
      aria-label={globals.stringsAriaLabelNotifications}
      className="pointer-events-none fixed bottom-4 right-4 z-[var(--pb-z-max)] flex flex-col-reverse gap-2"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} />
        </div>
      ))}
    </div>
  );
}

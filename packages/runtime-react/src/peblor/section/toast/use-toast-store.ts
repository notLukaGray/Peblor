"use client";

import { create } from "zustand";

export type ToastVariant = "info" | "success" | "error" | "warning";

export interface ToastEntry {
  id: number;
  message: string;
  variant: ToastVariant;
  durationMs: number;
}

interface ToastStore {
  toasts: ToastEntry[];
  push: (entry: Omit<ToastEntry, "id">) => void;
  dismiss: (id: number) => void;
}

let _nextId = 0;

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],
  push: (entry) =>
    set((state) => {
      if (state.toasts.length >= 5) return state;
      return { toasts: [...state.toasts, { ...entry, id: _nextId++ }] };
    }),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

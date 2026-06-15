"use client";

import { useEffect } from "react";
import {
  WORKBENCH_SESSION_CHANGED_EVENT,
  WORKBENCH_SESSION_STORAGE_KEY,
} from "@/app/dev/workbench/workbench-session";
import type { PersistedShape } from "@/app/dev/elements/_shared/typography-controller-types";

type Params<K extends string, V, P extends PersistedShape<K, V>> = {
  hydrated: boolean;
  readPersisted: () => P | null;
  defaults: { defaultVariant: K; variants: Record<K, V> };
  setDefaultVariant: (value: K) => void;
  setVariants: (value: Record<K, V>) => void;
  setActiveVariant: (value: K) => void;
  setIsCustomVariant: (value: boolean) => void;
};

export function useTypographyControllerSessionSync<
  K extends string,
  V,
  P extends PersistedShape<K, V>,
>({
  hydrated,
  readPersisted,
  defaults,
  setDefaultVariant,
  setVariants,
  setActiveVariant,
  setIsCustomVariant,
}: Params<K, V, P>) {
  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    const syncFromSession = () => {
      const saved = readPersisted();
      if (saved) {
        setDefaultVariant(saved.defaultVariant);
        setVariants(saved.variants);
        setActiveVariant(saved.defaultVariant);
        return;
      }
      setDefaultVariant(defaults.defaultVariant);
      setVariants(defaults.variants);
      setActiveVariant(defaults.defaultVariant);
      setIsCustomVariant(false);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === WORKBENCH_SESSION_STORAGE_KEY) syncFromSession();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(WORKBENCH_SESSION_CHANGED_EVENT, syncFromSession);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(WORKBENCH_SESSION_CHANGED_EVENT, syncFromSession);
    };
  }, [
    defaults.defaultVariant,
    defaults.variants,
    hydrated,
    readPersisted,
    setActiveVariant,
    setDefaultVariant,
    setIsCustomVariant,
    setVariants,
  ]);
}

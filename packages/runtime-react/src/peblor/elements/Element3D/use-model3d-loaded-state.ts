"use client";

import { startTransition, useCallback, useEffect, useState } from "react";

const model3DLoadedStateById = new Map<string, boolean>();

type Options = {
  id?: string;
  initiallyLoaded: boolean;
};

export function useModel3DLoadedState({ id, initiallyLoaded }: Options) {
  const stateKey = id ?? null;
  const [isLoaded, setIsLoaded] = useState(() =>
    stateKey != null ? (model3DLoadedStateById.get(stateKey) ?? initiallyLoaded) : initiallyLoaded
  );

  useEffect(() => {
    if (!stateKey || model3DLoadedStateById.has(stateKey)) return;
    model3DLoadedStateById.set(stateKey, isLoaded);
  }, [isLoaded, stateKey]);

  const setLoadedState = useCallback(
    (next: boolean | ((prev: boolean) => boolean), options?: { transition?: boolean }) => {
      const apply = () =>
        setIsLoaded((prev) => {
          const value = typeof next === "function" ? next(prev) : next;
          if (stateKey) model3DLoadedStateById.set(stateKey, value);
          return value;
        });

      if (options?.transition) {
        startTransition(apply);
        return;
      }
      apply();
    },
    [stateKey]
  );

  return { isLoaded, setLoadedState, stateKey };
}

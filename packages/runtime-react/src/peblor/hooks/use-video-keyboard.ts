"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getVideoActionHandler, type VideoActionHandlers } from "@pb/core/media";

export type VideoKeyBinding = {
  key: string;
  action: string;
  payload?: number;
};

/** Keys that scroll the page by default — prevent scroll when player is focused. */
const SCROLL_KEYS = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

export function useVideoKeyboard({
  containerRef,
  keyBindings,
  handlers,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
  keyBindings: VideoKeyBinding[] | undefined;
  handlers: VideoActionHandlers;
}) {
  const handlersRef = useRef(handlers);
  const [el, setEl] = useState<HTMLElement | null>(null);

  const callbackRef = useCallback(
    (node: HTMLElement | null) => {
      containerRef.current = node;
      setEl(node);
    },
    [containerRef]
  );

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useLayoutEffect(() => {
    if (!keyBindings?.length) return;

    const currentEl = el;
    if (!currentEl) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const binding = keyBindings.find((b) => b.key === e.code || b.key === e.key);
      if (!binding) return;

      const handler = getVideoActionHandler(binding.action, binding.payload, handlersRef.current);
      if (!handler) return;

      if (SCROLL_KEYS.has(e.code)) e.preventDefault();
      handler();
    };

    currentEl.addEventListener("keydown", handleKeyDown);
    return () => currentEl.removeEventListener("keydown", handleKeyDown);
  }, [keyBindings, el]);

  return callbackRef;
}

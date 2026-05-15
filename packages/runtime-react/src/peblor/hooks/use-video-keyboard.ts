"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!keyBindings?.length) return;

    const el = containerRef.current;
    if (!el) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const binding = keyBindings.find((b) => b.key === e.code || b.key === e.key);
      if (!binding) return;

      const handler = getVideoActionHandler(binding.action, binding.payload, handlersRef.current);
      if (!handler) return;

      if (SCROLL_KEYS.has(e.code)) e.preventDefault();
      handler();
    };

    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, [keyBindings, containerRef]);
}

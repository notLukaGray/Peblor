"use client";

import { useCallback, useState } from "react";
import { flushSync } from "react-dom";
import { useInView } from "@/peblor/integrations/framer-motion/viewport";
import { MOTION_DEFAULTS } from "@pb/contracts/peblor/core/peblor-motion-defaults";

type UseVideoLazyLoadParams = {
  autoplay: boolean;
  hasSource: boolean;
  priority?: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
};

export function useVideoLazyLoad({
  autoplay,
  hasSource,
  priority = false,
  containerRef,
}: UseVideoLazyLoadParams) {
  const [userArmed, setUserArmed] = useState(false);

  const isInView = useInView(containerRef, {
    amount: MOTION_DEFAULTS.viewport.amount,
    once: MOTION_DEFAULTS.viewport.once,
  });

  const shouldLoadVideo = priority || autoplay || (hasSource && (isInView || userArmed));

  const armVideoLoad = useCallback(() => {
    setUserArmed(true);
  }, []);

  const armVideoLoadImmediately = useCallback(() => {
    flushSync(() => {
      setUserArmed(true);
    });
  }, []);

  return { shouldLoadVideo, armVideoLoad, armVideoLoadImmediately };
}

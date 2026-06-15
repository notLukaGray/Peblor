"use client";

import type { ComponentType, ReactNode } from "react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { MixedElementGroupIslandProps } from "./MixedElementGroupIsland";

const MixedIsland = dynamic(() =>
  import("./MixedElementGroupIsland").then(
    (mod) => mod.MixedElementGroupIsland as ComponentType<MixedElementGroupIslandProps>
  )
) as ComponentType<MixedElementGroupIslandProps>;

type Props = MixedElementGroupIslandProps & {
  hydrationPriority?: "critical" | "approaching" | "idle";
};

export function ClientMixedElementGroupShell({ hydrationPriority = "idle", ...props }: Props) {
  const [shouldHydrate, setShouldHydrate] = useState(hydrationPriority === "critical");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shouldHydrate) return;

    const rootMargin = hydrationPriority === "approaching" ? "150%" : "50%";

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldHydrate(true);
          io.disconnect();
        }
      },
      { rootMargin: `${rootMargin} 0px` }
    );

    if (ref.current) io.observe(ref.current);

    const timeoutId = setTimeout(() => setShouldHydrate(true), 4000);

    return () => {
      io.disconnect();
      clearTimeout(timeoutId);
    };
  }, [hydrationPriority, shouldHydrate]);

  if (!shouldHydrate) {
    // Server-rendered placeholder: render children inside a minimal div wrapper.
    // The children have already been server-rendered by MixedServerElementGroup.
    // When the island hydrates near the viewport, React reconciles the existing
    // DOM nodes — no structural CLS because the outer div type is preserved.
    return (
      <div ref={ref} data-progressive-hydration="element-group">
        {props.children as ReactNode}
      </div>
    );
  }

  return <MixedIsland {...(props as MixedElementGroupIslandProps)} />;
}

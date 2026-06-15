"use client";

import { useRef } from "react";
import { ScrollContainerProvider } from "@pb/runtime-react/scroll";

/**
 * Universal scroll shell for peblor pages.
 *
 * Architecture notes:
 *
 * 1. **Fixed scroll container**: The outer div is `fixed inset-0` so it creates
 *    a viewport-sized scroll container. This is necessary because Framer Motion's
 *    `useScroll()` and `useInView()` hooks need a scrollable container with non-static
 *    position to compute scroll progress. A page-level scroll on `<body>` would not
 *    allow motion hooks to work correctly with scroll-driven animations.
 *
 * 2. **ScrollContainerProvider**: Wraps the scrollable div in a React context so
 *    child components (sections, parallax backgrounds, scroll-triggered animations)
 *    can access the scroll container ref. This is used by:
 *    - `useSectionScrollProgress` (section scroll progress tracking)
 *    - `useIntersectionObserver` (visibility-based triggers)
 *    - Parallax background layers
 *
 * 3. **safe-area-inset padding**: Accounts for notched devices so content doesn't
 *    render behind the notch or rounded corners on iOS/tvOS.
 *
 * Alternative approaches considered:
 * - Using `<body>` as the scroll container: breaks Framer Motion scroll hooks
 * - Per-section scroll containers: complex state management for multi-section pages
 * - CSS `scroll-snap` for the container: adds complexity without benefit for
 *   continuous-scroll pages
 *
 * This fixed-scroll-div approach is the simplest that works with the full motion pipeline.
 */
export function UniversalPeblorShell({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <ScrollContainerProvider containerRef={scrollRef}>
      <div
        ref={scrollRef}
        className="work-scroll fixed inset-0 w-full min-w-0 overflow-y-auto overflow-x-hidden"
        style={{
          backgroundColor: "var(--background)",
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
      >
        {children}
      </div>
    </ScrollContainerProvider>
  );
}

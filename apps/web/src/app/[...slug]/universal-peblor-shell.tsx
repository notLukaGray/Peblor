"use client";

import { useRef } from "react";
import { ScrollContainerProvider } from "@pb/runtime-react/scroll";

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

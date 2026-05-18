import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HeroProject } from "@/core/lib/globals";
import { HomeView } from "./HomeView";

type GlobalWithCarouselProbe = typeof globalThis & {
  __NOTLUKAGRAY_HOME_CAROUSEL_SLOT_RENDERS__?: number;
};

function carouselProbeGlobal(): GlobalWithCarouselProbe {
  return globalThis as GlobalWithCarouselProbe;
}

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/core/hooks/use-after-lcp", () => ({
  useAfterLcp: () => true,
}));

vi.mock("@/core/hooks/use-project-navigation", () => ({
  useProjectNavigation: () => {},
}));

vi.mock("@/core/ui/TransitionLink", () => ({
  TransitionLink: ({
    children,
    href,
    ...rest
  }: {
    children?: React.ReactNode;
    href: string;
    className?: string;
    "aria-label"?: string;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("framer-motion", () => {
  const Passthrough = ({
    children,
    whileHover: _whileHover,
    whileTap: _whileTap,
    whileFocus: _whileFocus,
    onAnimationComplete: _onAnimationComplete,
    ...rest
  }: {
    children?: React.ReactNode;
    whileHover?: unknown;
    whileTap?: unknown;
    whileFocus?: unknown;
    onAnimationComplete?: unknown;
    [key: string]: unknown;
  }) => <div {...rest}>{children}</div>;
  return { motion: { div: Passthrough, nav: Passthrough } };
});

const heroProjects: HeroProject[] = [
  { id: "p1", title: "One", slug: "one", description: "D1", brand: { name: "B1", slug: "b1" } },
  { id: "p2", title: "Two", slug: "two", description: "D2", brand: { name: "B2", slug: "b2" } },
  { id: "p3", title: "Three", slug: "three", description: "D3", brand: { name: "B3", slug: "b3" } },
];

let root: Root | null = null;
let host: HTMLDivElement | null = null;

beforeEach(() => {
  carouselProbeGlobal().__NOTLUKAGRAY_HOME_CAROUSEL_SLOT_RENDERS__ = 0;
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root?.unmount();
    });
  }
  root = null;
  if (host) host.remove();
  host = null;
  carouselProbeGlobal().__NOTLUKAGRAY_HOME_CAROUSEL_SLOT_RENDERS__ = 0;
});

describe("HomeView carousel (PERF-6)", () => {
  it("does not re-render every carousel slot on each mousemove while hovering (memo + scoped tooltipMouse)", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => {
      root?.render(<HomeView heroProjects={heroProjects} />);
    });

    const afterMount = carouselProbeGlobal().__NOTLUKAGRAY_HOME_CAROUSEL_SLOT_RENDERS__ ?? 0;
    expect(afterMount).toBeGreaterThanOrEqual(7);

    const firstInteractive = host.querySelector('[data-project-id="p1"]');
    if (!(firstInteractive instanceof HTMLElement)) {
      throw new Error("Expected carousel item with data-project-id");
    }

    await act(async () => {
      firstInteractive.dispatchEvent(
        new MouseEvent("mouseenter", { bubbles: true, clientX: 10, clientY: 10 })
      );
    });

    const afterEnter = carouselProbeGlobal().__NOTLUKAGRAY_HOME_CAROUSEL_SLOT_RENDERS__ ?? 0;

    for (let i = 0; i < 40; i++) {
      await act(async () => {
        firstInteractive.dispatchEvent(
          new MouseEvent("mousemove", { bubbles: true, clientX: 20 + i, clientY: 30 + i })
        );
      });
    }

    const afterMoves = carouselProbeGlobal().__NOTLUKAGRAY_HOME_CAROUSEL_SLOT_RENDERS__ ?? 0;
    const delta = afterMoves - afterEnter;

    /**
     * Without per-slot memo + `tooltipMouse` scoped to the hovered row, each `mousemove` RAF
     * commit would re-run all 7 slot bodies (~7× per frame). With PERF-6, only the hovered
     * slot should receive changing props, so incremental renders from moves stay O(1) not O(7).
     */
    expect(delta).toBeLessThan(120);
  });
});

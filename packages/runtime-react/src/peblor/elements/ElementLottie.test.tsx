import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { elementLottieSchema } from "@pb/contracts/peblor/core/peblor-schemas";
import type { ElementBlock } from "@pb/contracts/types";
import { ElementLottie } from "./ElementLottie";

type LottieBlock = Extract<ElementBlock, { type: "elementLottie" }>;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { mockLoadAnimation, getLastAnim, fireMock } = vi.hoisted(() => {
  const fireMock = vi.fn();
  let lastAnim: { fireComplete: () => void } | null = null;

  const mockLoadAnimation = vi.fn(() => {
    let completeCb: (() => void) | null = null;
    const anim = {
      addEventListener(event: string, cb: () => void) {
        if (event === "complete") completeCb = cb;
      },
      destroy: vi.fn(),
      fireComplete() {
        completeCb?.();
      },
    };
    lastAnim = anim;
    return anim;
  });

  return {
    mockLoadAnimation,
    getLastAnim: () => lastAnim,
    fireMock,
  };
});

vi.mock("lottie-web", () => ({
  default: {
    loadAnimation: mockLoadAnimation,
  },
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/peblor/triggers", () => ({
  firePeblorAction: (...args: unknown[]) => fireMock(...args),
}));

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(async () => {
  fireMock.mockClear();
  mockLoadAnimation.mockClear();
  if (root) {
    await act(async () => {
      root?.unmount();
    });
  }
  root = null;
  if (host) host.remove();
  host = null;
});

async function flushLottieImport() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("ElementLottie", () => {
  it("fires the latest onComplete for the same src without reloading lottie when the action object identity changes", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    const first = elementLottieSchema.parse({
      type: "elementLottie",
      src: "animations/test.json",
      onComplete: { type: "navigate", payload: { href: "/first" } },
    }) as LottieBlock;

    await act(async () => {
      root?.render(<ElementLottie {...first} />);
    });
    await flushLottieImport();

    expect(mockLoadAnimation).toHaveBeenCalledTimes(1);

    const second: LottieBlock = {
      ...first,
      onComplete: { type: "navigate", payload: { href: "/second" } },
    };

    await act(async () => {
      root?.render(<ElementLottie {...second} />);
    });
    await flushLottieImport();

    expect(mockLoadAnimation).toHaveBeenCalledTimes(1);

    fireMock.mockClear();
    await act(async () => {
      getLastAnim()?.fireComplete();
    });

    expect(fireMock).toHaveBeenCalledTimes(1);
    expect(fireMock).toHaveBeenCalledWith(
      { type: "navigate", payload: { href: "/second" } },
      "system"
    );
  });
});

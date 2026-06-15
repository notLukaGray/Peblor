import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PEBLOR_TRIGGER_EVENT } from "@/peblor/triggers";
import { ClientPageRuntimeIsland } from "./ClientPageRuntimeIsland";

vi.mock("next/navigation", () => ({
  usePathname: () => "/test",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(async () => {
  vi.restoreAllMocks();

  if (root) {
    await act(async () => {
      root?.unmount();
    });
  }

  root = null;

  if (host) {
    host.remove();
  }
  host = null;
});

describe("ClientPageRuntimeIsland", () => {
  it("routes offset scroll actions through the active page scroll container", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => {
      root?.render(
        <ClientPageRuntimeIsland scroll={{ scrollY: "auto" }}>
          <div style={{ height: "200vh" }}>Page content</div>
        </ClientPageRuntimeIsland>
      );
    });

    const scrollContainer = host.querySelector(".work-scroll");
    if (!(scrollContainer instanceof HTMLDivElement)) {
      throw new Error("Expected page scroll container");
    }

    const containerScrollTo = vi.fn();
    Object.defineProperty(scrollContainer, "scrollTo", {
      value: containerScrollTo,
      configurable: true,
    });
    const windowScrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(PEBLOR_TRIGGER_EVENT, {
          detail: {
            action: {
              type: "scrollTo",
              payload: { offset: 240, behavior: "smooth" },
            },
          },
        })
      );
    });

    expect(containerScrollTo).toHaveBeenCalledWith({ top: 240, behavior: "smooth" });
    expect(windowScrollTo).not.toHaveBeenCalled();
  });
});

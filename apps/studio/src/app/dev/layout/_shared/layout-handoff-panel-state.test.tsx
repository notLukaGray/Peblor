import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import {
  LAYOUT_HANDOFF_VISIBILITY_STORAGE_KEY,
  useLayoutHandoffPanelVisibility,
} from "./layout-handoff-panel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Harness() {
  const { handoffPanelVisible, toggleHandoffPanel } = useLayoutHandoffPanelVisibility();
  return (
    <button type="button" onClick={toggleHandoffPanel}>
      {handoffPanelVisible ? "visible" : "hidden"}
    </button>
  );
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;

async function mountHarness(innerWidth: number): Promise<HTMLButtonElement> {
  localStorage.removeItem(LAYOUT_HANDOFF_VISIBILITY_STORAGE_KEY);
  Object.defineProperty(window, "innerWidth", {
    value: innerWidth,
    writable: true,
    configurable: true,
  });
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(<Harness />);
  });
  const button = host.querySelector("button");
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error("Expected mounted button");
  }
  return button;
}

afterEach(async () => {
  localStorage.removeItem(LAYOUT_HANDOFF_VISIBILITY_STORAGE_KEY);
  if (root) {
    await act(async () => {
      root?.unmount();
    });
  }
  root = null;
  if (host) host.remove();
  host = null;
});

describe("layout handoff panel state hook", () => {
  it("uses responsive defaults when no saved preference exists", async () => {
    const smallButton = await mountHarness(1200);
    expect(smallButton.textContent).toBe("hidden");

    await act(async () => {
      root?.unmount();
    });
    if (host) host.remove();

    const largeButton = await mountHarness(1500);
    expect(largeButton.textContent).toBe("visible");
  });

  it("toggles state and persists globally", async () => {
    const button = await mountHarness(1500);
    expect(button.textContent).toBe("visible");

    await act(async () => {
      button.click();
    });

    expect(button.textContent).toBe("hidden");
    expect(localStorage.getItem(LAYOUT_HANDOFF_VISIBILITY_STORAGE_KEY)).toBe("hidden");
  });
});

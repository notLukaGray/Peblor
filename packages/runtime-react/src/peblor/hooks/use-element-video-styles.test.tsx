import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { DeviceTypeProvider } from "@pb/runtime-react/core/providers/device-type-provider";
import { useElementVideoStyles } from "./use-element-video-styles";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Harness({ aspectRatio }: { aspectRatio: [string, string] }) {
  return (
    <DeviceTypeProvider>
      <Probe aspectRatio={aspectRatio} />
    </DeviceTypeProvider>
  );
}

function Probe({ aspectRatio }: { aspectRatio: [string, string] }) {
  const styles = useElementVideoStyles({
    width: "100%",
    height: "hug",
    aspectRatio,
    moduleConfig: {
      container: {
        padding: "10px",
        borderRadius: "20px",
      },
    },
  });

  return <div data-testid="container" style={styles.containerStyle} />;
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;

async function renderHarness(isMobile: boolean): Promise<HTMLDivElement> {
  Object.defineProperty(window, "innerWidth", {
    value: isMobile ? 480 : 1280,
    writable: true,
    configurable: true,
  });
  document.documentElement.style.setProperty("--pb-breakpoint-desktop", "768px");

  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root?.render(<Harness aspectRatio={["4 / 3", "16 / 9"]} />);
  });

  const el = host.querySelector('[data-testid="container"]');
  if (!(el instanceof HTMLDivElement)) {
    throw new Error("Expected rendered video container");
  }
  return el;
}

afterEach(async () => {
  if (root) {
    await act(async () => {
      root?.unmount();
    });
  }
  root = null;
  if (host) host.remove();
  host = null;
});

describe("useElementVideoStyles", () => {
  it("resolves the mobile aspect ratio onto the container style", async () => {
    const el = await renderHarness(true);

    expect(el.style.aspectRatio).toBe("4 / 3");
    expect(el.style.height).toBe("auto");
  });

  it("resolves the desktop aspect ratio onto the container style", async () => {
    const el = await renderHarness(false);

    expect(el.style.aspectRatio).toBe("16 / 9");
    expect(el.style.height).toBe("auto");
  });
});

/**
 * Verifies that ClientMixedContentBlockShell produces a DOM structure that
 * matches MixedSectionContentBlockIsland so hydration is a style patch rather
 * than a full DOM remount:
 *
 *   <section style={shellStyle} …>
 *     <div className="…" style={contentWrapperStyle}>{children}</div>
 *   </section>
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ClientMixedContentBlockShell } from "./ClientMixedContentBlockShell";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLDivElement | null = null;

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

async function renderShell(children: React.ReactNode, gap?: string) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(
      <ClientMixedContentBlockShell
        type="contentBlock"
        elementCount={1}
        hydrationPriority="idle"
        gap={gap}
      >
        {children}
      </ClientMixedContentBlockShell>
    );
  });
  return host;
}

describe("ClientMixedContentBlockShell — Phase 3 structural alignment", () => {
  it("outer element is <section> not <div>", async () => {
    const container = await renderShell(<span data-testid="child" />, undefined);
    expect(container.querySelector("section")).not.toBeNull();
    expect(container.firstElementChild?.tagName.toLowerCase()).toBe("section");
  });

  it("children are wrapped in a content wrapper <div> inside the section", async () => {
    const container = await renderShell(<span data-testid="child" />);
    const wrapper = container.querySelector("section > div");
    expect(wrapper).not.toBeNull();
    expect(container.querySelector("section > [data-testid='child']")).toBeNull();
    expect(container.querySelector("section > div > [data-testid='child']")).not.toBeNull();
  });

  it("content wrapper has display:flex style", async () => {
    const container = await renderShell(<span />);
    const wrapper = container.querySelector("section > div");
    expect(wrapper).not.toBeNull();
    const style = (wrapper as HTMLElement).style;
    expect(style.display).toBe("flex");
  });

  it("content wrapper applies gap when gap prop is provided", async () => {
    const container = await renderShell(<span />, "24px");
    const wrapper = container.querySelector("section > div");
    expect(wrapper).not.toBeNull();
    const style = (wrapper as HTMLElement).style.cssText;
    expect(style).toContain("gap");
  });

  it("section has data-section-type contentBlock attribute", async () => {
    const container = await renderShell(<span />);
    const section = container.querySelector("section");
    expect(section?.getAttribute("data-section-type")).toBe("contentBlock");
  });
});

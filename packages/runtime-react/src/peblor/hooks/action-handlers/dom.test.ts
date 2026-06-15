import type { ActionHandlerContext } from "./types";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DOM_HANDLERS } from "./dom";
import { resolveAuthoredUrl } from "@pb/runtime-react/core/lib/url-policy";

vi.mock("@pb/runtime-react/core/lib/url-policy", () => ({
  resolveAuthoredUrl: vi.fn(),
}));

const mockCtx = {
  router: { push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() },
  variables: {} as Record<string, unknown>,
  scrollContainerRef: null as React.RefObject<HTMLElement | null> | null,
  smoothScrollTo: null,
  fireAction: vi.fn(),
  audioMap: new Map(),
  abortControllers: new Map(),
  debounceTimers: new Map(),
  waitForUnsubscribes: new Set<() => void>(),
} as unknown as ActionHandlerContext;

describe("DOM_HANDLERS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    document.title = "Original Title";
    // Reset inline styles on documentElement
    document.documentElement.style.cssText = "";
  });

  describe("copyToClipboard", () => {
    it("calls navigator.clipboard.writeText with the provided text", () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      });
      DOM_HANDLERS.copyToClipboard!({ text: "hello" }, mockCtx as ActionHandlerContext);
      expect(writeText).toHaveBeenCalledWith("hello");
    });

    it("does nothing when text is null", () => {
      const writeText = vi.fn();
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      });
      DOM_HANDLERS.copyToClipboard!({ text: null } as never, mockCtx as ActionHandlerContext);
      expect(writeText).not.toHaveBeenCalled();
    });

    it("does nothing when text is undefined", () => {
      const writeText = vi.fn();
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      });
      DOM_HANDLERS.copyToClipboard!({}, mockCtx as ActionHandlerContext);
      expect(writeText).not.toHaveBeenCalled();
    });

    it("handles clipboard not being available", () => {
      Object.defineProperty(navigator, "clipboard", {
        value: undefined,
        configurable: true,
      });
      expect(() =>
        DOM_HANDLERS.copyToClipboard!({ text: "test" }, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        DOM_HANDLERS.copyToClipboard!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("vibrate", () => {
    it("calls navigator.vibrate with default pattern", () => {
      const vibrate = vi.fn();
      Object.defineProperty(navigator, "vibrate", {
        value: vibrate,
        configurable: true,
      });
      DOM_HANDLERS.vibrate!({}, mockCtx as ActionHandlerContext);
      expect(vibrate).toHaveBeenCalledWith(50);
    });

    it("calls navigator.vibrate with custom pattern", () => {
      const vibrate = vi.fn();
      Object.defineProperty(navigator, "vibrate", {
        value: vibrate,
        configurable: true,
      });
      DOM_HANDLERS.vibrate!({ pattern: [200, 100, 200] }, mockCtx as ActionHandlerContext);
      expect(vibrate).toHaveBeenCalledWith([200, 100, 200]);
    });

    it("handles vibrate not being available", () => {
      Object.defineProperty(navigator, "vibrate", {
        value: undefined,
        configurable: true,
      });
      expect(() =>
        DOM_HANDLERS.vibrate!({ pattern: 100 }, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });

    it("handles undefined payload gracefully", () => {
      expect(() => DOM_HANDLERS.vibrate!(undefined, mockCtx as ActionHandlerContext)).not.toThrow();
    });
  });

  describe("setDocumentTitle", () => {
    it("sets document.title", () => {
      DOM_HANDLERS.setDocumentTitle!({ title: "New Title" }, mockCtx as ActionHandlerContext);
      expect(document.title).toBe("New Title");
    });

    it("does nothing when title is null", () => {
      DOM_HANDLERS.setDocumentTitle!({ title: null } as never, mockCtx as ActionHandlerContext);
      expect(document.title).toBe("Original Title");
    });

    it("does nothing when title is undefined", () => {
      DOM_HANDLERS.setDocumentTitle!({}, mockCtx as ActionHandlerContext);
      expect(document.title).toBe("Original Title");
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        DOM_HANDLERS.setDocumentTitle!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("openExternalUrl", () => {
    it("opens URL in new window with noopener,noreferrer", () => {
      vi.mocked(resolveAuthoredUrl).mockReturnValue({ ok: true, url: "https://example.com" });
      const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
      DOM_HANDLERS.openExternalUrl!(
        { url: "https://example.com" },
        mockCtx as ActionHandlerContext
      );
      expect(resolveAuthoredUrl).toHaveBeenCalledWith("https://example.com", "external");
      expect(openSpy).toHaveBeenCalledWith("https://example.com", "_blank", "noopener,noreferrer");
    });

    it("uses custom target", () => {
      vi.mocked(resolveAuthoredUrl).mockReturnValue({ ok: true, url: "https://example.com" });
      const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
      DOM_HANDLERS.openExternalUrl!({ url: "https://example.com", target: "_self" }, mockCtx);
      expect(openSpy).toHaveBeenCalledWith("https://example.com", "_self", "noopener,noreferrer");
    });

    it("does nothing when resolveAuthoredUrl fails", () => {
      vi.mocked(resolveAuthoredUrl).mockReturnValue({ ok: false, reason: "blocked" as const });
      const openSpy = vi.spyOn(window, "open");
      DOM_HANDLERS.openExternalUrl!({ url: "bad-url" }, mockCtx as ActionHandlerContext);
      expect(openSpy).not.toHaveBeenCalled();
    });

    it("does nothing when url is null", () => {
      const openSpy = vi.spyOn(window, "open");
      DOM_HANDLERS.openExternalUrl!({ url: null } as never, mockCtx as ActionHandlerContext);
      expect(openSpy).not.toHaveBeenCalled();
    });

    it("does nothing when url is undefined", () => {
      const openSpy = vi.spyOn(window, "open");
      DOM_HANDLERS.openExternalUrl!({}, mockCtx as ActionHandlerContext);
      expect(openSpy).not.toHaveBeenCalled();
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        DOM_HANDLERS.openExternalUrl!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("setCssVariable", () => {
    it("sets a CSS variable on root element", () => {
      DOM_HANDLERS.setCssVariable!(
        { property: "--my-color", value: "red" },
        mockCtx as ActionHandlerContext
      );
      expect(document.documentElement.style.getPropertyValue("--my-color")).toBe("red");
    });

    it("auto-prefixes '--' when missing", () => {
      DOM_HANDLERS.setCssVariable!(
        { property: "my-color", value: "blue" },
        mockCtx as ActionHandlerContext
      );
      expect(document.documentElement.style.getPropertyValue("--my-color")).toBe("blue");
    });

    it("sets variable on a specific element via selector", () => {
      const div = document.createElement("div");
      div.className = "target";
      document.body.appendChild(div);
      DOM_HANDLERS.setCssVariable!(
        { property: "--bg", value: "black", selector: ".target" },
        mockCtx as ActionHandlerContext
      );
      expect(div.style.getPropertyValue("--bg")).toBe("black");
    });

    it("does nothing when property is null", () => {
      DOM_HANDLERS.setCssVariable!({ property: null } as never, mockCtx as ActionHandlerContext);
      expect(document.documentElement.style.length).toBe(0);
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        DOM_HANDLERS.setCssVariable!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("focusElement", () => {
    it("focuses an element by id", () => {
      const input = document.createElement("input");
      input.id = "myInput";
      document.body.appendChild(input);
      const focusSpy = vi.spyOn(input, "focus");
      DOM_HANDLERS.focusElement!({ id: "myInput" }, mockCtx as ActionHandlerContext);
      expect(focusSpy).toHaveBeenCalled();
    });

    it("does nothing when element does not exist", () => {
      expect(() =>
        DOM_HANDLERS.focusElement!({ id: "nonexistent" }, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        DOM_HANDLERS.focusElement!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("blurElement", () => {
    it("blurs an element by id", () => {
      const input = document.createElement("input");
      input.id = "myInput";
      document.body.appendChild(input);
      const blurSpy = vi.spyOn(input, "blur");
      DOM_HANDLERS.blurElement!({ id: "myInput" }, mockCtx as ActionHandlerContext);
      expect(blurSpy).toHaveBeenCalled();
    });

    it("does nothing when element does not exist", () => {
      expect(() =>
        DOM_HANDLERS.blurElement!({ id: "nonexistent" }, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        DOM_HANDLERS.blurElement!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("setInputValue", () => {
    it("sets value on an input element", () => {
      const input = document.createElement("input");
      input.id = "myInput";
      input.value = "old";
      document.body.appendChild(input);
      DOM_HANDLERS.setInputValue!({ id: "myInput", value: "new" }, mockCtx as ActionHandlerContext);
      expect(input.value).toBe("new");
    });

    it("dispatches input and change events", () => {
      const input = document.createElement("input");
      input.id = "myInput";
      document.body.appendChild(input);
      const dispatched: string[] = [];
      input.addEventListener("input", () => dispatched.push("input"));
      input.addEventListener("change", () => dispatched.push("change"));
      DOM_HANDLERS.setInputValue!(
        { id: "myInput", value: "test" },
        mockCtx as ActionHandlerContext
      );
      expect(dispatched).toContain("input");
      expect(dispatched).toContain("change");
    });

    it("sets empty string when value is undefined", () => {
      const input = document.createElement("input");
      input.id = "myInput";
      input.value = "something";
      document.body.appendChild(input);
      DOM_HANDLERS.setInputValue!({ id: "myInput" }, mockCtx as ActionHandlerContext);
      expect(input.value).toBe("");
    });

    it("does nothing when id is null", () => {
      expect(() =>
        DOM_HANDLERS.setInputValue!({ id: null } as never, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        DOM_HANDLERS.setInputValue!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("dispatchCustomEvent", () => {
    it("dispatches a custom event with peblor-custom: prefix", () => {
      const spy = vi.spyOn(window, "dispatchEvent");
      DOM_HANDLERS.dispatchCustomEvent!({ name: "my-event", detail: { key: "value" } }, mockCtx);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "peblor-custom:my-event",
          detail: { key: "value" },
        })
      );
    });

    it("does nothing when name is null", () => {
      const spy = vi.spyOn(window, "dispatchEvent");
      DOM_HANDLERS.dispatchCustomEvent!({ name: null } as never, mockCtx as ActionHandlerContext);
      expect(spy).not.toHaveBeenCalled();
    });

    it("does nothing when name is undefined", () => {
      const spy = vi.spyOn(window, "dispatchEvent");
      DOM_HANDLERS.dispatchCustomEvent!({}, mockCtx as ActionHandlerContext);
      expect(spy).not.toHaveBeenCalled();
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        DOM_HANDLERS.dispatchCustomEvent!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("setUrlParam", () => {
    it("adds a query parameter using pushState by default", () => {
      // Capture the URL before
      const pushStateSpy = vi.spyOn(window.history, "pushState");
      DOM_HANDLERS.setUrlParam!(
        { param: "q", value: "search-term" },
        mockCtx as ActionHandlerContext
      );
      expect(pushStateSpy).toHaveBeenCalledWith(
        null,
        "",
        expect.stringContaining("?q=search-term")
      );
    });

    it("uses replaceState when replace is true", () => {
      const replaceStateSpy = vi.spyOn(window.history, "replaceState");
      DOM_HANDLERS.setUrlParam!({ param: "q", value: "search", replace: true }, mockCtx);
      expect(replaceStateSpy).toHaveBeenCalledWith(null, "", expect.stringContaining("?q=search"));
      expect(window.history.pushState).not.toHaveBeenCalled();
    });

    it("sets empty string when value is undefined", () => {
      const pushStateSpy = vi.spyOn(window.history, "pushState");
      DOM_HANDLERS.setUrlParam!({ param: "q" }, mockCtx as ActionHandlerContext);
      expect(pushStateSpy).toHaveBeenCalledWith(null, "", expect.stringContaining("?q="));
    });

    it("does nothing when param is null", () => {
      const pushStateSpy = vi.spyOn(window.history, "pushState");
      DOM_HANDLERS.setUrlParam!({ param: null } as never, mockCtx as ActionHandlerContext);
      expect(pushStateSpy).not.toHaveBeenCalled();
    });

    it("does nothing when param is undefined", () => {
      const pushStateSpy = vi.spyOn(window.history, "pushState");
      DOM_HANDLERS.setUrlParam!({}, mockCtx as ActionHandlerContext);
      expect(pushStateSpy).not.toHaveBeenCalled();
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        DOM_HANDLERS.setUrlParam!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });
});

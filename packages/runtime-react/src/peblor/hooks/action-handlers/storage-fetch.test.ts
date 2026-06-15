import type { ActionHandlerContext } from "./types";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { STORAGE_FETCH_HANDLERS } from "./storage-fetch";
import { FETCH_API_HANDLERS } from "./fetch-api";
import { useVariableStore, clearVariables } from "@/peblor/runtime/peblor-variable-store";
import { firePeblorAction } from "@/peblor/triggers/core/trigger-event";

vi.mock("@/peblor/triggers/core/trigger-event", () => ({
  firePeblorAction: vi.fn(),
}));

const mockCtx = {
  router: { push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() },
  variables: {} as Record<string, unknown>,
  scrollContainerRef: null as React.RefObject<HTMLElement | null> | null,
  smoothScrollTo: null,
  fireAction: vi.fn(),
  audioMap: new Map(),
  abortControllers: new Map<string, AbortController>(),
  debounceTimers: new Map<string, ReturnType<typeof setTimeout>>(),
  waitForUnsubscribes: new Set<() => void>(),
} as unknown as ActionHandlerContext;

describe("STORAGE_FETCH_HANDLERS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearVariables();
    localStorage.clear();
    sessionStorage.clear();

    // Clean up DOM for setTheme
    document.documentElement.classList.remove("light", "dark");
    delete document.documentElement.dataset.pbForcedTheme;
  });

  describe("setLocalStorage", () => {
    it("sets a JSON value in localStorage", () => {
      STORAGE_FETCH_HANDLERS.setLocalStorage!({ key: "myKey", value: { nested: true } }, mockCtx);
      expect(localStorage.getItem("myKey")).toBe(JSON.stringify({ nested: true }));
    });

    it("warns and returns when key is null", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      STORAGE_FETCH_HANDLERS.setLocalStorage!({ key: null, value: "test" } as never, mockCtx);
      expect(warnSpy).toHaveBeenCalledWith("[peblor] setLocalStorage called without a key");
      expect(localStorage.getItem("null")).toBeNull();
    });

    it("warns and returns when key is undefined", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      STORAGE_FETCH_HANDLERS.setLocalStorage!({}, mockCtx as ActionHandlerContext);
      expect(warnSpy).toHaveBeenCalled();
    });

    it("stores primitive values as JSON", () => {
      STORAGE_FETCH_HANDLERS.setLocalStorage!(
        { key: "num", value: 42 },
        mockCtx as ActionHandlerContext
      );
      expect(localStorage.getItem("num")).toBe("42");
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        STORAGE_FETCH_HANDLERS.setLocalStorage!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("setSessionStorage", () => {
    it("sets a JSON value in sessionStorage", () => {
      STORAGE_FETCH_HANDLERS.setSessionStorage!({ key: "sessionKey", value: [1, 2, 3] }, mockCtx);
      expect(sessionStorage.getItem("sessionKey")).toBe(JSON.stringify([1, 2, 3]));
    });

    it("warns and returns when key is null", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      STORAGE_FETCH_HANDLERS.setSessionStorage!({ key: null } as never, mockCtx);
      expect(warnSpy).toHaveBeenCalled();
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        STORAGE_FETCH_HANDLERS.setSessionStorage!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("setTheme", () => {
    it("sets theme to dark", () => {
      STORAGE_FETCH_HANDLERS.setTheme!({ mode: "dark" }, mockCtx as ActionHandlerContext);
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.documentElement.classList.contains("light")).toBe(false);
    });

    it("sets theme to light", () => {
      document.documentElement.classList.add("dark");
      STORAGE_FETCH_HANDLERS.setTheme!({ mode: "light" }, mockCtx as ActionHandlerContext);
      expect(document.documentElement.classList.contains("light")).toBe(true);
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("toggles theme from light to dark", () => {
      document.documentElement.classList.add("light");
      STORAGE_FETCH_HANDLERS.setTheme!({ mode: "toggle" }, mockCtx as ActionHandlerContext);
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("toggles theme from dark to light", () => {
      document.documentElement.classList.add("dark");
      STORAGE_FETCH_HANDLERS.setTheme!({ mode: "toggle" }, mockCtx as ActionHandlerContext);
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });

    it("persists theme to localStorage", () => {
      STORAGE_FETCH_HANDLERS.setTheme!({ mode: "dark" }, mockCtx as ActionHandlerContext);
      expect(localStorage.getItem("theme")).toBe("dark");
    });

    it("does not change theme when forcedTheme is set", () => {
      document.documentElement.dataset.pbForcedTheme = "light";
      document.documentElement.classList.add("dark");
      STORAGE_FETCH_HANDLERS.setTheme!({ mode: "toggle" }, mockCtx as ActionHandlerContext);
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("does nothing for invalid mode", () => {
      document.documentElement.classList.add("light");
      STORAGE_FETCH_HANDLERS.setTheme!({ mode: "invalid" }, mockCtx as ActionHandlerContext);
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        STORAGE_FETCH_HANDLERS.setTheme!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("fetchApi", () => {
    beforeEach(() => {
      vi.spyOn(globalThis, "fetch");
    });

    it("makes a fetch request and stores the response", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ data: "hello" }), {
          headers: { "content-type": "application/json" },
        })
      );
      FETCH_API_HANDLERS.fetchApi!({ url: "/api/hello", responseKey: "apiResult" }, mockCtx);
      await vi.waitFor(() => {
        expect(useVariableStore.getState().variables.apiResult).toEqual({
          data: "hello",
        });
      });
    });

    it("sets statusKey to 'loading' then 'loaded'", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          headers: { "content-type": "application/json" },
        })
      );
      FETCH_API_HANDLERS.fetchApi!(
        { url: "/api/status", responseKey: "result", statusKey: "status" },
        mockCtx
      );
      // Immediately sets loading
      expect(useVariableStore.getState().variables.status).toBe("loading");
      await vi.waitFor(() => {
        expect(useVariableStore.getState().variables.status).toBe("loaded");
      });
    });

    it("sets errorKey on failure", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response("Not Found", {
          status: 404,
          statusText: "Not Found",
          headers: { "content-type": "text/plain" },
        })
      );
      FETCH_API_HANDLERS.fetchApi!(
        { url: "/api/missing", responseKey: "data", errorKey: "err" },
        mockCtx
      );
      await vi.waitFor(() => {
        const err = useVariableStore.getState().variables.err as {
          status: number;
          message: string;
        } as unknown as { status: number; message: string };
        expect(err.status).toBe(404);
      });
    });

    it("fires onSuccess callback on success", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          headers: { "content-type": "application/json" },
        })
      );
      FETCH_API_HANDLERS.fetchApi!(
        {
          url: "/api/success",
          responseKey: "data",
          onSuccess: {
            type: "setVariable" as const,
            payload: { key: "completed", value: true },
          },
        },
        mockCtx
      );
      await vi.waitFor(() => {
        expect(firePeblorAction).toHaveBeenCalled();
      });
    });

    it("fires onError callback on failure", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("Network error"));
      FETCH_API_HANDLERS.fetchApi!(
        {
          url: "/api/fail",
          responseKey: "data",
          errorKey: "err",
          onError: {
            type: "setVariable" as const,
            payload: { key: "failed", value: true },
          },
        },
        mockCtx
      );
      await vi.waitFor(() => {
        expect(firePeblorAction).toHaveBeenCalled();
      });
    });

    it("resolves URL template variables", async () => {
      useVariableStore.getState().setVariable("userId", "42");
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({}), {
          headers: { "content-type": "application/json" },
        })
      );
      FETCH_API_HANDLERS.fetchApi!({ url: "/api/user/{userId}", responseKey: "user" }, mockCtx);
      await vi.waitFor(() => {
        expect(fetch).toHaveBeenCalledWith("/api/user/42", expect.anything());
      });
    });

    it("resolves header template variables", async () => {
      useVariableStore.getState().setVariable("token", "abc123");
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({}), {
          headers: { "content-type": "application/json" },
        })
      );
      FETCH_API_HANDLERS.fetchApi!(
        {
          url: "/api/data",
          responseKey: "data",
          headers: { Authorization: "Bearer $var.token" },
        },
        mockCtx
      );
      await vi.waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          "/api/data",
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: "Bearer abc123",
            }),
          })
        );
      });
    });

    it("sends JSON body for POST requests", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({}), {
          headers: { "content-type": "application/json" },
        })
      );
      FETCH_API_HANDLERS.fetchApi!(
        {
          url: "/api/submit",
          method: "POST",
          body: { name: "test" },
          responseKey: "result",
        },
        mockCtx
      );
      await vi.waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          "/api/submit",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ name: "test" }),
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
          })
        );
      });
    });

    it("respects retries on failure", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("Temp fail"));
      FETCH_API_HANDLERS.fetchApi!(
        {
          url: "/api/retry",
          responseKey: "data",
          retries: 2,
          retryDelay: 10,
          errorKey: "err",
        },
        mockCtx
      );
      // Should retry 2 times = 3 total attempts
      await vi.waitFor(
        () => {
          expect(fetch).toHaveBeenCalledTimes(3);
        },
        { timeout: 500 }
      );
    });

    it("debounces requests when debounceMs is set", async () => {
      vi.useFakeTimers();
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ done: true }), {
          headers: { "content-type": "application/json" },
        })
      );
      FETCH_API_HANDLERS.fetchApi!(
        { url: "/api/search", responseKey: "results", debounceMs: 300 },
        mockCtx
      );
      // Should not fire immediately
      expect(fetch).not.toHaveBeenCalled();
      vi.advanceTimersByTime(300);
      expect(fetch).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it("aborts previous request with the same cancelKey", async () => {
      vi.useFakeTimers();
      const abortSpy = vi.spyOn(AbortController.prototype, "abort");
      FETCH_API_HANDLERS.fetchApi!(
        { url: "/api/cancel", responseKey: "data", cancelKey: "req1" },
        mockCtx
      );
      // Second call with same cancelKey aborts the first
      FETCH_API_HANDLERS.fetchApi!(
        { url: "/api/cancel", responseKey: "data", cancelKey: "req1" },
        mockCtx
      );
      expect(abortSpy).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it("throws on undefined payload because url is undefined and accessed", () => {
      // payload ?? {} then p.url is undefined, then (p.url as string).replace(...) throws
      expect(() =>
        FETCH_API_HANDLERS.fetchApi!(undefined, mockCtx as ActionHandlerContext)
      ).toThrow(TypeError);
    });
  });

  describe("abortFetch", () => {
    it("aborts and removes the cancel key", () => {
      const controller = new AbortController();
      const abortSpy = vi.spyOn(controller, "abort");
      const ctx = {
        ...mockCtx,
        abortControllers: new Map([["request1", controller]]),
      } as unknown as ActionHandlerContext;
      FETCH_API_HANDLERS.abortFetch!({ cancelKey: "request1" }, ctx);
      expect(abortSpy).toHaveBeenCalled();
      expect(ctx.abortControllers.has("request1")).toBe(false);
    });

    it("does nothing when cancelKey is null", () => {
      const ctx = {
        ...mockCtx,
        abortControllers: new Map([["req", new AbortController()]]),
      } as unknown as ActionHandlerContext;
      expect(() => FETCH_API_HANDLERS.abortFetch!({ cancelKey: null } as never, ctx)).not.toThrow();
    });

    it("does nothing when cancelKey does not exist", () => {
      const ctx = {
        ...mockCtx,
        abortControllers: new Map(),
      } as unknown as ActionHandlerContext;
      expect(() => FETCH_API_HANDLERS.abortFetch!({ cancelKey: "unknown" }, ctx)).not.toThrow();
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        FETCH_API_HANDLERS.abortFetch!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });
});

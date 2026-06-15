import type { ActionHandlerContext } from "./types";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { STATE_HANDLERS } from "./state";
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
  abortControllers: new Map(),
  debounceTimers: new Map(),
  waitForUnsubscribes: new Set<() => void>(),
} as unknown as ActionHandlerContext;

describe("STATE_HANDLERS", () => {
  beforeEach(() => {
    clearVariables();
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    // Set up window.location for URL param tests — happy-dom restricts origin so use relative
    window.history.replaceState(
      {},
      "",
      "/?testParam=hello&numParam=42&boolParam=true&jsonParam=%7B%22a%22%3A1%7D"
    );
  });

  afterEach(() => {
    clearVariables();
  });

  describe("setVariable", () => {
    it("sets a variable in the store", () => {
      STATE_HANDLERS.setVariable!(
        { key: "myVar", value: "hello" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.myVar).toBe("hello");
    });

    it("overwrites an existing variable", () => {
      STATE_HANDLERS.setVariable!(
        { key: "myVar", value: "first" },
        mockCtx as ActionHandlerContext
      );
      STATE_HANDLERS.setVariable!(
        { key: "myVar", value: "second" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.myVar).toBe("second");
    });

    it("stores null value", () => {
      STATE_HANDLERS.setVariable!({ key: "nullVar", value: null }, mockCtx as ActionHandlerContext);
      expect(useVariableStore.getState().variables.nullVar).toBeNull();
    });

    it("stores number value", () => {
      STATE_HANDLERS.setVariable!({ key: "num", value: 42 }, mockCtx as ActionHandlerContext);
      expect(useVariableStore.getState().variables.num).toBe(42);
    });

    it("stores object value", () => {
      const obj = { nested: { a: 1 } } as unknown as ActionHandlerContext;
      STATE_HANDLERS.setVariable!({ key: "obj", value: obj }, mockCtx as ActionHandlerContext);
      expect(useVariableStore.getState().variables.obj).toEqual(obj);
    });

    it("stores array value", () => {
      const arr = [1, 2, 3];
      STATE_HANDLERS.setVariable!({ key: "arr", value: arr }, mockCtx as ActionHandlerContext);
      expect(useVariableStore.getState().variables.arr).toEqual(arr);
    });

    it("handles undefined payload gracefully", () => {
      // Should not throw — will set a variable with key "undefined" since payload ?? {} becomes {}
      expect(() =>
        STATE_HANDLERS.setVariable!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("incrementVariable", () => {
    it("increments an existing numeric variable by 1 (default)", () => {
      useVariableStore.getState().setVariable("count", 10);
      STATE_HANDLERS.incrementVariable!({ key: "count" }, mockCtx as ActionHandlerContext);
      expect(useVariableStore.getState().variables.count).toBe(11);
    });

    it("increments by a custom amount", () => {
      useVariableStore.getState().setVariable("count", 10);
      STATE_HANDLERS.incrementVariable!({ key: "count", by: 5 }, mockCtx as ActionHandlerContext);
      expect(useVariableStore.getState().variables.count).toBe(15);
    });

    it("starts from 0 when variable does not exist", () => {
      STATE_HANDLERS.incrementVariable!({ key: "newCount" }, mockCtx as ActionHandlerContext);
      expect(useVariableStore.getState().variables.newCount).toBe(1);
    });

    it("starts from 0 when variable is not a number", () => {
      useVariableStore.getState().setVariable("str", "hello");
      STATE_HANDLERS.incrementVariable!({ key: "str", by: 3 }, mockCtx as ActionHandlerContext);
      expect(useVariableStore.getState().variables.str).toBe(3);
    });

    it("handles negative increments", () => {
      useVariableStore.getState().setVariable("count", 10);
      STATE_HANDLERS.incrementVariable!({ key: "count", by: -3 }, mockCtx as ActionHandlerContext);
      expect(useVariableStore.getState().variables.count).toBe(7);
    });

    it("handles undefined payload gracefully", () => {
      STATE_HANDLERS.incrementVariable!(undefined, mockCtx as ActionHandlerContext);
      // Should not throw
    });
  });

  describe("toggleVariable", () => {
    it("toggles to first value when variable is unset", () => {
      STATE_HANDLERS.toggleVariable!(
        { key: "toggle", values: ["on", "off"] },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.toggle).toBe("on");
    });

    it("toggles to first value when current matches second", () => {
      useVariableStore.getState().setVariable("toggle", "off");
      STATE_HANDLERS.toggleVariable!(
        { key: "toggle", values: ["on", "off"] },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.toggle).toBe("on");
    });

    it("toggles to first value when current equals first", () => {
      useVariableStore.getState().setVariable("toggle", "on");
      STATE_HANDLERS.toggleVariable!(
        { key: "toggle", values: ["on", "off"] },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.toggle).toBe("off");
    });

    it("toggles boolean values", () => {
      useVariableStore.getState().setVariable("flag", true);
      STATE_HANDLERS.toggleVariable!(
        { key: "flag", values: [true, false] },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.flag).toBe(false);
    });

    it("uses Object.is comparison for NaN values", () => {
      useVariableStore.getState().setVariable("nan", NaN);
      STATE_HANDLERS.toggleVariable!(
        { key: "nan", values: [NaN, 0] },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.nan).toBe(0);
    });

    it("throws when values array is missing from payload", () => {
      // Handler casts payload with values: [JsonValue, JsonValue] so missing values is undefined
      expect(() =>
        STATE_HANDLERS.toggleVariable!({ key: "test" } as never, mockCtx as ActionHandlerContext)
      ).toThrow(TypeError);
    });
  });

  describe("deleteVariable", () => {
    it("deletes an existing variable", () => {
      useVariableStore.getState().setVariable("temp", "value");
      STATE_HANDLERS.deleteVariable!({ key: "temp" }, mockCtx as ActionHandlerContext);
      expect(useVariableStore.getState().variables.temp).toBeUndefined();
    });

    it("does nothing when variable does not exist", () => {
      STATE_HANDLERS.deleteVariable!({ key: "nonexistent" }, mockCtx as ActionHandlerContext);
      expect(Object.keys(useVariableStore.getState().variables)).toHaveLength(0);
    });

    it("handles undefined payload gracefully", () => {
      STATE_HANDLERS.deleteVariable!(undefined, mockCtx as ActionHandlerContext);
    });
  });

  describe("readLocalStorage", () => {
    it("reads a JSON value from localStorage and sets it as a variable", () => {
      localStorage.setItem("saved", JSON.stringify({ name: "test" }));
      STATE_HANDLERS.readLocalStorage!({ key: "saved" }, mockCtx as ActionHandlerContext);
      expect(useVariableStore.getState().variables.saved).toEqual({ name: "test" });
    });

    it("uses the same key for the variable when 'as' is not provided", () => {
      localStorage.setItem("name", JSON.stringify("Alice"));
      STATE_HANDLERS.readLocalStorage!({ key: "name" }, mockCtx as ActionHandlerContext);
      expect(useVariableStore.getState().variables.name).toBe("Alice");
    });

    it("uses the 'as' key for the variable when provided", () => {
      localStorage.setItem("storedKey", JSON.stringify("value"));
      STATE_HANDLERS.readLocalStorage!(
        { key: "storedKey", as: "myVar" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.myVar).toBe("value");
    });

    it("sets null when localStorage key does not exist", () => {
      STATE_HANDLERS.readLocalStorage!({ key: "missing" }, mockCtx as ActionHandlerContext);
      expect(useVariableStore.getState().variables.missing).toBeNull();
    });

    it("handles non-JSON localStorage value gracefully", () => {
      localStorage.setItem("invalid", "not-json");
      STATE_HANDLERS.readLocalStorage!({ key: "invalid" }, mockCtx as ActionHandlerContext);
      // Should still parse and set null on error
      expect(useVariableStore.getState().variables.invalid).toBeNull();
    });

    it("reads a plain string value", () => {
      localStorage.setItem("str", JSON.stringify("plain string"));
      STATE_HANDLERS.readLocalStorage!({ key: "str" }, mockCtx as ActionHandlerContext);
      expect(useVariableStore.getState().variables.str).toBe("plain string");
    });

    it("handles undefined payload gracefully", () => {
      STATE_HANDLERS.readLocalStorage!(undefined, mockCtx as ActionHandlerContext);
    });
  });

  describe("readSessionStorage", () => {
    it("reads a JSON value from sessionStorage", () => {
      sessionStorage.setItem("sessionData", JSON.stringify(42));
      STATE_HANDLERS.readSessionStorage!({ key: "sessionData" }, mockCtx as ActionHandlerContext);
      expect(useVariableStore.getState().variables.sessionData).toBe(42);
    });

    it("uses 'as' key when provided", () => {
      sessionStorage.setItem("x", JSON.stringify("y"));
      STATE_HANDLERS.readSessionStorage!({ key: "x", as: "z" }, mockCtx as ActionHandlerContext);
      expect(useVariableStore.getState().variables.z).toBe("y");
    });

    it("sets null when sessionStorage key does not exist", () => {
      STATE_HANDLERS.readSessionStorage!({ key: "missing" }, mockCtx as ActionHandlerContext);
      expect(useVariableStore.getState().variables.missing).toBeNull();
    });

    it("handles undefined payload gracefully", () => {
      STATE_HANDLERS.readSessionStorage!(undefined, mockCtx as ActionHandlerContext);
    });
  });

  describe("readUrlParam", () => {
    it("reads a URL query parameter as string", () => {
      STATE_HANDLERS.readUrlParam!({ param: "testParam" }, mockCtx as ActionHandlerContext);
      expect(useVariableStore.getState().variables.testParam).toBe("hello");
    });

    it("uses 'as' key when provided", () => {
      STATE_HANDLERS.readUrlParam!(
        { param: "testParam", as: "renamed" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.renamed).toBe("hello");
    });

    it("parses as number", () => {
      STATE_HANDLERS.readUrlParam!(
        { param: "numParam", parse: "number" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.numParam).toBe(42);
    });

    it("parses as boolean: true", () => {
      STATE_HANDLERS.readUrlParam!(
        { param: "boolParam", parse: "boolean" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.boolParam).toBe(true);
    });

    it("parses as boolean: '1'", () => {
      window.history.replaceState({}, "", "/?flag=1");
      STATE_HANDLERS.readUrlParam!(
        { param: "flag", parse: "boolean" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.flag).toBe(true);
    });

    it("parses as boolean: '0' returns false", () => {
      window.history.replaceState({}, "", "/?flag=0");
      STATE_HANDLERS.readUrlParam!(
        { param: "flag", parse: "boolean" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.flag).toBe(false);
    });

    it("parses as JSON", () => {
      STATE_HANDLERS.readUrlParam!(
        { param: "jsonParam", parse: "json" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.jsonParam).toEqual({ a: 1 });
    });

    it("falls back to raw string when JSON parse fails", () => {
      window.history.replaceState({}, "", "/?badJson=not-valid-json");
      STATE_HANDLERS.readUrlParam!(
        { param: "badJson", parse: "json" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.badJson).toBe("not-valid-json");
    });

    it("sets null when param is missing", () => {
      STATE_HANDLERS.readUrlParam!({ param: "missingParam" }, mockCtx as ActionHandlerContext);
      expect(useVariableStore.getState().variables.missingParam).toBeNull();
    });

    it("handles undefined payload gracefully", () => {
      STATE_HANDLERS.readUrlParam!(undefined, mockCtx as ActionHandlerContext);
    });
  });

  describe("setVariablePath", () => {
    it("sets a variable at a dot path", () => {
      STATE_HANDLERS.setVariablePath!(
        { path: "user.name", value: "Alice" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables).toEqual({
        user: { name: "Alice" },
      });
    });

    it("overwrites part of an existing object", () => {
      useVariableStore.getState().setVariable("user", { name: "Bob", age: 30 });
      STATE_HANDLERS.setVariablePath!(
        { path: "user.name", value: "Alice" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.user).toEqual({ name: "Alice", age: 30 });
    });

    it("handles undefined payload gracefully", () => {
      // setVariablePath(undefined, mockCtx as ActionHandlerContext) -> setVariablePath(undefined, undefined)
      // -> path.split() throws TypeError because path is undefined
      expect(() =>
        STATE_HANDLERS.setVariablePath!(undefined, mockCtx as ActionHandlerContext)
      ).toThrow(TypeError);
    });
  });

  describe("appendToArray", () => {
    it("appends a value to an existing array", () => {
      useVariableStore.getState().setVariable("items", [1, 2]);
      STATE_HANDLERS.appendToArray!({ key: "items", value: 3 }, mockCtx as ActionHandlerContext);
      expect(useVariableStore.getState().variables.items).toEqual([1, 2, 3]);
    });

    it("creates a new array when variable does not exist", () => {
      STATE_HANDLERS.appendToArray!(
        { key: "newArr", value: "first" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.newArr).toEqual(["first"]);
    });

    it("creates a new array when existing variable is not an array", () => {
      useVariableStore.getState().setVariable("notArr", "string");
      STATE_HANDLERS.appendToArray!(
        { key: "notArr", value: "item" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.notArr).toEqual(["item"]);
    });

    it("handles undefined payload gracefully", () => {
      STATE_HANDLERS.appendToArray!(undefined, mockCtx as ActionHandlerContext);
    });
  });

  describe("removeFromArray", () => {
    it("removes an item by index", () => {
      useVariableStore.getState().setVariable("items", ["a", "b", "c"]);
      STATE_HANDLERS.removeFromArray!({ key: "items", index: 1 }, mockCtx as ActionHandlerContext);
      expect(useVariableStore.getState().variables.items).toEqual(["a", "c"]);
    });

    it("removes items matching a 'where' condition", () => {
      useVariableStore.getState().setVariable("users", [
        { name: "Alice", role: "admin" },
        { name: "Bob", role: "user" },
        { name: "Charlie", role: "admin" },
      ]);
      STATE_HANDLERS.removeFromArray!(
        {
          key: "users",
          where: { path: "role", operator: "equals", value: "admin" },
        },
        mockCtx
      );
      expect(useVariableStore.getState().variables.users).toEqual([{ name: "Bob", role: "user" }]);
    });

    it("does nothing if key is not an array", () => {
      useVariableStore.getState().setVariable("notArr", "string");
      STATE_HANDLERS.removeFromArray!({ key: "notArr", index: 0 }, mockCtx as ActionHandlerContext);
      expect(useVariableStore.getState().variables.notArr).toBe("string");
    });

    it("handles undefined payload gracefully", () => {
      STATE_HANDLERS.removeFromArray!(undefined, mockCtx as ActionHandlerContext);
    });
  });

  describe("mergeVariable", () => {
    it("merges an object into an existing object variable", () => {
      useVariableStore.getState().setVariable("settings", { theme: "dark" });
      STATE_HANDLERS.mergeVariable!({ key: "settings", value: { fontSize: 14 } }, mockCtx);
      expect(useVariableStore.getState().variables.settings).toEqual({
        theme: "dark",
        fontSize: 14,
      });
    });

    it("creates a new object when variable does not exist", () => {
      STATE_HANDLERS.mergeVariable!({ key: "opts", value: { a: 1 } }, mockCtx);
      expect(useVariableStore.getState().variables.opts).toEqual({ a: 1 });
    });

    it("overwrites existing properties on merge", () => {
      useVariableStore.getState().setVariable("cfg", { x: 1, y: 2 });
      STATE_HANDLERS.mergeVariable!(
        { key: "cfg", value: { y: 99 } },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.cfg).toEqual({ x: 1, y: 99 });
    });

    it("handles undefined payload gracefully", () => {
      STATE_HANDLERS.mergeVariable!(undefined, mockCtx as ActionHandlerContext);
    });
  });

  describe("waitFor", () => {
    it("fires 'then' action immediately when conditions already pass", () => {
      useVariableStore.getState().setVariable("ready", true);
      STATE_HANDLERS.waitFor!(
        {
          conditions: [{ variable: "ready", operator: "equals" as const, value: true }],
          then: { type: "setVariable", payload: { key: "done", value: true } },
        },
        mockCtx
      );
      expect(firePeblorAction).toHaveBeenCalledWith(
        { type: "setVariable", payload: { key: "done", value: true } },
        "system"
      );
    });

    it("subscribes and fires then when conditions become true", () => {
      STATE_HANDLERS.waitFor!(
        {
          conditions: [{ variable: "flag", operator: "equals" as const, value: true }],
          then: { type: "setVariable", payload: { key: "done", value: true } },
        },
        mockCtx
      );
      expect(firePeblorAction).not.toHaveBeenCalled();
      // Trigger the condition
      useVariableStore.getState().setVariable("flag", true);
      expect(firePeblorAction).toHaveBeenCalledWith(
        { type: "setVariable", payload: { key: "done", value: true } },
        "system"
      );
    });

    it("fires onTimeout when timeout elapses before condition met", () => {
      vi.useFakeTimers();
      STATE_HANDLERS.waitFor!(
        {
          conditions: [{ variable: "flag", operator: "equals" as const, value: true }],
          then: { type: "setVariable", payload: { key: "done", value: true } },
          timeout: 100,
          onTimeout: { type: "setVariable", payload: { key: "timedOut", value: true } },
        },
        mockCtx
      );
      expect(firePeblorAction).not.toHaveBeenCalled();
      vi.advanceTimersByTime(100);
      expect(firePeblorAction).toHaveBeenCalledWith(
        { type: "setVariable", payload: { key: "timedOut", value: true } },
        "system"
      );
      vi.useRealTimers();
    });

    it("adds unsubscribe to waitForUnsubscribes", () => {
      const unsubs = new Set<() => void>();
      STATE_HANDLERS.waitFor!(
        {
          conditions: [{ variable: "x", operator: "equals" as const, value: 1 }],
          then: { type: "setVariable", payload: { key: "done", value: true } },
        },
        { ...mockCtx, waitForUnsubscribes: unsubs }
      );
      expect(unsubs.size).toBe(1);
    });
  });

  describe("computeVariable", () => {
    it("computes 'length' of an array", () => {
      useVariableStore.getState().setVariable("arr", [1, 2, 3]);
      STATE_HANDLERS.computeVariable!(
        { operation: "length", key: "len", from: "arr" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.len).toBe(3);
    });

    it("computes 'length' of a string", () => {
      useVariableStore.getState().setVariable("str", "hello");
      STATE_HANDLERS.computeVariable!(
        { operation: "length", key: "len", from: "str" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.len).toBe(5);
    });

    it("computes 'length' of non-string/array as 0", () => {
      useVariableStore.getState().setVariable("num", 42);
      STATE_HANDLERS.computeVariable!(
        { operation: "length", key: "len", from: "num" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.len).toBe(0);
    });

    it("computes 'keys' of an object", () => {
      useVariableStore.getState().setVariable("obj", { a: 1, b: 2 });
      STATE_HANDLERS.computeVariable!(
        { operation: "keys", key: "k", from: "obj" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.k).toEqual(["a", "b"]);
    });

    it("computes 'keys' of a non-object as empty array", () => {
      useVariableStore.getState().setVariable("notObj", "hello");
      STATE_HANDLERS.computeVariable!(
        { operation: "keys", key: "k", from: "notObj" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.k).toEqual([]);
    });

    it("computes 'values' of an object", () => {
      useVariableStore.getState().setVariable("obj", { a: 1, b: 2 });
      STATE_HANDLERS.computeVariable!(
        { operation: "values", key: "v", from: "obj" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.v).toEqual([1, 2]);
    });

    it("computes 'add'", () => {
      useVariableStore.getState().setVariable("a", 10);
      useVariableStore.getState().setVariable("b", 5);
      STATE_HANDLERS.computeVariable!(
        { operation: "add", key: "result", left: "a", right: "b" },
        mockCtx
      );
      expect(useVariableStore.getState().variables.result).toBe(15);
    });

    it("computes 'subtract'", () => {
      STATE_HANDLERS.computeVariable!(
        { operation: "subtract", key: "result", left: 10, right: 3 },
        mockCtx
      );
      expect(useVariableStore.getState().variables.result).toBe(7);
    });

    it("computes 'multiply'", () => {
      STATE_HANDLERS.computeVariable!(
        { operation: "multiply", key: "result", left: 4, right: 3 },
        mockCtx
      );
      expect(useVariableStore.getState().variables.result).toBe(12);
    });

    it("computes 'divide'", () => {
      STATE_HANDLERS.computeVariable!(
        { operation: "divide", key: "result", left: 10, right: 2 },
        mockCtx
      );
      expect(useVariableStore.getState().variables.result).toBe(5);
    });

    it("computes 'divide' by zero as 0", () => {
      STATE_HANDLERS.computeVariable!(
        { operation: "divide", key: "result", left: 10, right: 0 },
        mockCtx
      );
      expect(useVariableStore.getState().variables.result).toBe(0);
    });

    it("computes 'modulo'", () => {
      STATE_HANDLERS.computeVariable!(
        { operation: "modulo", key: "result", left: 10, right: 3 },
        mockCtx
      );
      expect(useVariableStore.getState().variables.result).toBe(1);
    });

    it("computes 'modulo' by zero as 0", () => {
      STATE_HANDLERS.computeVariable!(
        { operation: "modulo", key: "result", left: 10, right: 0 },
        mockCtx
      );
      expect(useVariableStore.getState().variables.result).toBe(0);
    });

    it("computes 'abs'", () => {
      STATE_HANDLERS.computeVariable!({ operation: "abs", key: "result", from: -5 }, mockCtx);
      expect(useVariableStore.getState().variables.result).toBe(5);
    });

    it("computes 'floor'", () => {
      STATE_HANDLERS.computeVariable!({ operation: "floor", key: "result", from: 3.7 }, mockCtx);
      expect(useVariableStore.getState().variables.result).toBe(3);
    });

    it("computes 'ceil'", () => {
      STATE_HANDLERS.computeVariable!({ operation: "ceil", key: "result", from: 3.1 }, mockCtx);
      expect(useVariableStore.getState().variables.result).toBe(4);
    });

    it("computes 'round'", () => {
      STATE_HANDLERS.computeVariable!({ operation: "round", key: "result", from: 3.5 }, mockCtx);
      expect(useVariableStore.getState().variables.result).toBe(4);
    });

    it("computes 'not' as boolean negation", () => {
      useVariableStore.getState().setVariable("flag", false);
      STATE_HANDLERS.computeVariable!(
        { operation: "not", key: "result", from: "flag" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.result).toBe(true);
    });

    it("computes 'toNumber'", () => {
      STATE_HANDLERS.computeVariable!(
        { operation: "toNumber", key: "result", from: "42" },
        mockCtx
      );
      expect(useVariableStore.getState().variables.result).toBe(42);
    });

    it("computes 'toString'", () => {
      STATE_HANDLERS.computeVariable!({ operation: "toString", key: "result", from: 42 }, mockCtx);
      expect(useVariableStore.getState().variables.result).toBe("42");
    });

    it("computes 'toBoolean'", () => {
      useVariableStore.getState().setVariable("flag", "non-empty");
      STATE_HANDLERS.computeVariable!(
        { operation: "toBoolean", key: "result", from: "flag" },
        mockCtx
      );
      expect(useVariableStore.getState().variables.result).toBe(true);
    });

    it("computes 'min' of an array", () => {
      useVariableStore.getState().setVariable("vals", [3, 1, 7, 2]);
      STATE_HANDLERS.computeVariable!(
        { operation: "min", key: "result", from: "vals" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.result).toBe(1);
    });

    it("computes 'min' as 0 for non-array", () => {
      STATE_HANDLERS.computeVariable!(
        { operation: "min", key: "result", from: "notAnArray" },
        mockCtx
      );
      expect(useVariableStore.getState().variables.result).toBe(0);
    });

    it("computes 'max' of an array", () => {
      useVariableStore.getState().setVariable("vals", [3, 1, 7, 2]);
      STATE_HANDLERS.computeVariable!(
        { operation: "max", key: "result", from: "vals" },
        mockCtx as ActionHandlerContext
      );
      expect(useVariableStore.getState().variables.result).toBe(7);
    });

    it("computes 'clamp'", () => {
      STATE_HANDLERS.computeVariable!(
        { operation: "clamp", key: "result", from: 50, min: 0, max: 10 },
        mockCtx
      );
      expect(useVariableStore.getState().variables.result).toBe(10);
    });

    it("computes 'concat'", () => {
      useVariableStore.getState().setVariable("greeting", "Hello");
      STATE_HANDLERS.computeVariable!(
        { operation: "concat", key: "result", parts: ["greeting", " ", "World"] },
        mockCtx
      );
      expect(useVariableStore.getState().variables.result).toBe("Hello World");
    });

    it("computes 'slice' on array", () => {
      useVariableStore.getState().setVariable("arr", [1, 2, 3, 4, 5]);
      STATE_HANDLERS.computeVariable!(
        { operation: "slice", key: "result", from: "arr", start: 1, end: 3 },
        mockCtx
      );
      expect(useVariableStore.getState().variables.result).toEqual([2, 3]);
    });

    it("computes 'slice' on string", () => {
      useVariableStore.getState().setVariable("str", "hello world");
      STATE_HANDLERS.computeVariable!(
        { operation: "slice", key: "result", from: "str", start: 0, end: 5 },
        mockCtx
      );
      expect(useVariableStore.getState().variables.result).toBe("hello");
    });

    it("computes 'join'", () => {
      useVariableStore.getState().setVariable("items", ["a", "b", "c"]);
      STATE_HANDLERS.computeVariable!(
        { operation: "join", key: "result", from: "items", separator: "-" },
        mockCtx
      );
      expect(useVariableStore.getState().variables.result).toBe("a-b-c");
    });

    it("computes 'join' with default comma separator", () => {
      useVariableStore.getState().setVariable("items", ["a", "b", "c"]);
      STATE_HANDLERS.computeVariable!({ operation: "join", key: "result", from: "items" }, mockCtx);
      expect(useVariableStore.getState().variables.result).toBe("a,b,c");
    });

    it("computes 'split'", () => {
      useVariableStore.getState().setVariable("str", "a,b,c");
      STATE_HANDLERS.computeVariable!(
        { operation: "split", key: "result", from: "str", by: "," },
        mockCtx
      );
      expect(useVariableStore.getState().variables.result).toEqual(["a", "b", "c"]);
    });

    it("computes 'arrayIndex'", () => {
      useVariableStore.getState().setVariable("arr", [10, 20, 30]);
      STATE_HANDLERS.computeVariable!(
        { operation: "arrayIndex", key: "result", from: "arr", index: 1 },
        mockCtx
      );
      expect(useVariableStore.getState().variables.result).toBe(20);
    });

    it("computes 'arrayIndex' returns null for out-of-bounds", () => {
      useVariableStore.getState().setVariable("arr", [10, 20]);
      STATE_HANDLERS.computeVariable!(
        { operation: "arrayIndex", key: "result", from: "arr", index: 10 },
        mockCtx
      );
      expect(useVariableStore.getState().variables.result).toBeNull();
    });

    it("computes 'format' as Intl.NumberFormat", () => {
      STATE_HANDLERS.computeVariable!(
        {
          operation: "format",
          key: "result",
          from: 1234.56,
          template: "de-DE,currency|currency=EUR",
        },
        mockCtx
      );
      const result = useVariableStore.getState().variables.result;
      expect(result).toBe("1.234,56 €");
    });

    it("does nothing for unknown operation", () => {
      STATE_HANDLERS.computeVariable!(
        { operation: "nonexistent", key: "result", from: 42 },
        mockCtx
      );
      expect(useVariableStore.getState().variables.result).toBeUndefined();
    });

    it("handles undefined payload gracefully", () => {
      STATE_HANDLERS.computeVariable!(undefined, mockCtx as ActionHandlerContext);
    });
  });
});

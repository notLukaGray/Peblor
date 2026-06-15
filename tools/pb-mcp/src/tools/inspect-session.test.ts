import { describe, expect, it } from "vitest";
import {
  openPageSession,
  patchPageSession,
  inspectPageSession,
  closePageSession,
  sessionDiff,
  getSessionValue,
  setSessionValue,
} from "./page-session.js";

// ── inspect_session ──────────────────────────────────────────────────────────

describe("inspect_session", () => {
  it("returns summary metadata (default format) with schema-only validation", async () => {
    const opened = (await openPageSession.run({ route: "/profile" })) as {
      sessionId: string;
    };

    try {
      const result = (await inspectPageSession.run({
        sessionId: opened.sessionId,
      })) as {
        sessionId: string;
        route: string;
        filePath: string;
        patchCount: number;
        validationMode: string;
        valid: boolean;
        diagnostics: unknown[];
        sectionOrder: string[];
        changedPaths: string[];
        pageJson: null;
      };

      expect(result.sessionId).toBe(opened.sessionId);
      expect(result.route).toBe("/profile");
      expect(typeof result.filePath).toBe("string");
      expect(result.patchCount).toBe(0);
      expect(result.validationMode).toBe("schema-only");
      expect(typeof result.valid).toBe("boolean");
      expect(Array.isArray(result.diagnostics)).toBe(true);
      expect(Array.isArray(result.sectionOrder)).toBe(true);
      // Summary mode: changedPaths returned, pageJson is null
      expect(Array.isArray(result.changedPaths)).toBe(true);
      expect(result.changedPaths).toHaveLength(0); // no patches yet
      expect(result.pageJson).toBeNull();
    } finally {
      await closePageSession.run({ sessionId: opened.sessionId });
    }
  });

  it("format: full returns complete pageJson", async () => {
    const opened = (await openPageSession.run({ route: "/profile" })) as {
      sessionId: string;
    };

    try {
      const result = (await inspectPageSession.run({
        sessionId: opened.sessionId,
        format: "full",
      })) as { pageJson: Record<string, unknown> | null; changedPaths?: string[] };

      expect(result.pageJson).not.toBeNull();
      expect(typeof result.pageJson).toBe("object");
      expect(result.changedPaths).toBeUndefined();
    } finally {
      await closePageSession.run({ sessionId: opened.sessionId });
    }
  });

  it("reflects patches in patchCount and changedPaths", async () => {
    const opened = (await openPageSession.run({ route: "/profile" })) as {
      sessionId: string;
    };

    try {
      await patchPageSession.run({
        sessionId: opened.sessionId,
        patch: { title: "Patched Title For Inspect Test" },
      });

      const result = (await inspectPageSession.run({
        sessionId: opened.sessionId,
      })) as { patchCount: number; changedPaths: string[] };

      expect(result.patchCount).toBe(1);
      expect(result.changedPaths).toContain("title");
    } finally {
      await closePageSession.run({ sessionId: opened.sessionId });
    }
  });

  it("throws for an unknown session ID", async () => {
    await expect(
      inspectPageSession.run({ sessionId: "__nonexistent_session_id__" })
    ).rejects.toThrow("No session found");
  });
});

// ── session_diff ─────────────────────────────────────────────────────────────

describe("session_diff", () => {
  it("returns empty changes for a fresh session", async () => {
    const opened = (await openPageSession.run({ route: "/profile" })) as {
      sessionId: string;
    };
    try {
      const result = (await sessionDiff.run({ sessionId: opened.sessionId })) as {
        changeCount: number;
        changes: unknown[];
        summary: string;
      };
      expect(result.changeCount).toBe(0);
      expect(result.changes).toHaveLength(0);
      expect(result.summary).toBe("No changes");
    } finally {
      await closePageSession.run({ sessionId: opened.sessionId });
    }
  });

  it("reports a replace op after a title patch", async () => {
    const opened = (await openPageSession.run({ route: "/profile" })) as {
      sessionId: string;
    };
    try {
      await patchPageSession.run({
        sessionId: opened.sessionId,
        patch: { title: "__diff-test-title__" },
      });

      const result = (await sessionDiff.run({ sessionId: opened.sessionId })) as {
        changes: Array<{ op: string; path: string; to: unknown }>;
        summary: string;
      };

      expect(result.changes.length).toBeGreaterThan(0);
      const titleChange = result.changes.find((c) => c.path === "title");
      expect(titleChange).toBeDefined();
      expect(titleChange!.op).toBe("replace");
      expect(titleChange!.to).toBe("__diff-test-title__");
      expect(result.summary).toContain("edit");
    } finally {
      await closePageSession.run({ sessionId: opened.sessionId });
    }
  });

  it("throws for an unknown session ID", async () => {
    await expect(sessionDiff.run({ sessionId: "__bad__" })).rejects.toThrow("No session found");
  });
});

// ── get_session_value / set_session_value ─────────────────────────────────────

describe("get_session_value / set_session_value", () => {
  it("get_session_value returns the value at a top-level path", async () => {
    const opened = (await openPageSession.run({ route: "/profile" })) as {
      sessionId: string;
    };
    try {
      const result = (await getSessionValue.run({
        sessionId: opened.sessionId,
        path: "title",
      })) as { path: string; value: unknown };

      expect(result.path).toBe("title");
      expect(typeof result.value).toBe("string");
    } finally {
      await closePageSession.run({ sessionId: opened.sessionId });
    }
  });

  it("set_session_value updates a top-level field and increments patchCount", async () => {
    const opened = (await openPageSession.run({ route: "/profile" })) as {
      sessionId: string;
    };
    try {
      const result = (await setSessionValue.run({
        sessionId: opened.sessionId,
        path: "title",
        value: "__set-value-test__",
      })) as {
        path: string;
        previousValue: unknown;
        newValue: unknown;
        historyDepth: number;
        valid: boolean;
      };

      expect(result.path).toBe("title");
      expect(result.newValue).toBe("__set-value-test__");
      expect(result.historyDepth).toBe(1);
      expect(typeof result.valid).toBe("boolean");

      // Verify the value is reflected in a subsequent get
      const check = (await getSessionValue.run({
        sessionId: opened.sessionId,
        path: "title",
      })) as { value: unknown };
      expect(check.value).toBe("__set-value-test__");
    } finally {
      await closePageSession.run({ sessionId: opened.sessionId });
    }
  });

  it("get_session_value throws for a non-existent path", async () => {
    const opened = (await openPageSession.run({ route: "/profile" })) as {
      sessionId: string;
    };
    try {
      await expect(
        getSessionValue.run({ sessionId: opened.sessionId, path: "totally.made.up.path" })
      ).rejects.toThrow("Path not found");
    } finally {
      await closePageSession.run({ sessionId: opened.sessionId });
    }
  });

  it("set_session_value is undoable", async () => {
    const opened = (await openPageSession.run({ route: "/profile" })) as {
      sessionId: string;
    };
    const { undoPageSession } = await import("./page-session.js");
    try {
      const original = (await getSessionValue.run({
        sessionId: opened.sessionId,
        path: "title",
      })) as { value: unknown };

      await setSessionValue.run({
        sessionId: opened.sessionId,
        path: "title",
        value: "__will-be-undone__",
      });

      await undoPageSession.run({ sessionId: opened.sessionId });

      const after = (await getSessionValue.run({
        sessionId: opened.sessionId,
        path: "title",
      })) as { value: unknown };

      expect(after.value).toBe(original.value);
    } finally {
      await closePageSession.run({ sessionId: opened.sessionId });
    }
  });
});

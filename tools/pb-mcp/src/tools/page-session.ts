import { readFile, writeFile } from "node:fs/promises";
import { isRecord, validatePageAsync } from "@pb/core";
import { loadPeblorByPathAsync } from "@pb/core/loader";
import type { Tool } from "../types.js";
import { findPage } from "../lib/fs.js";
import { filePathToSlugSegments } from "../lib/slug.js";

type PageRecord = Record<string, unknown>;

type Session = {
  route: string;
  filePath: string;
  page: PageRecord;
  originalPage: PageRecord;
  history: PageRecord[];
  createdAt: number;
  updatedAt: number;
};

// In-process session store — survives across tool calls for the lifetime of the MCP server
const sessions = new Map<string, Session>();

function applyMergePatch(target: PageRecord, patch: PageRecord): PageRecord {
  const result = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key];
    } else if (isRecord(value) && isRecord(result[key])) {
      result[key] = applyMergePatch(result[key] as PageRecord, value as PageRecord);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ── open_page_session ────────────────────────────────────────────────────────

export const openPageSession: Tool = {
  def: {
    name: "open_page_session",
    description:
      "Load a page into the MCP server's memory to begin an editing session. Returns a session ID. All subsequent edits in this session use the in-memory copy — no disk reads per edit. Call commit_page_session when done.",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "Route path (e.g. '/about') or absolute file path" },
      },
      required: ["route"],
    },
  },
  run: async (args) => {
    const { route } = args as { route: string };
    const { content, path: filePath } = await findPage(route);
    const sessionId = `${route.replace(/\W+/g, "-")}-${Date.now()}`;
    const pageSnapshot = content as PageRecord;
    sessions.set(sessionId, {
      route,
      filePath,
      page: pageSnapshot,
      originalPage: structuredClone(pageSnapshot) as PageRecord,
      history: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const validation = await validatePageAsync(content);
    return {
      sessionId,
      route,
      filePath,
      valid: validation.valid,
      diagnostics: validation.valid ? [] : validation.diagnostics,
      sectionOrder: Array.isArray((content as PageRecord).sectionOrder)
        ? (content as PageRecord).sectionOrder
        : [],
    };
  },
};

// ── patch_page_session ───────────────────────────────────────────────────────

export const patchPageSession: Tool = {
  def: {
    name: "patch_page_session",
    description:
      "Apply a JSON merge patch to the in-memory page and validate immediately. If invalid, the patch is still held — you can inspect diagnostics and apply a correcting patch. History is maintained for undo. Nothing is written to disk.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Session ID from open_page_session" },
        patch: {
          type: "object",
          description:
            "JSON merge patch — keys set values, null removes keys, nested objects merge recursively, arrays replace entirely",
        },
      },
      required: ["sessionId", "patch"],
    },
  },
  run: async (args) => {
    const { sessionId, patch } = args as { sessionId: string; patch: PageRecord };
    const session = sessions.get(sessionId);
    if (!session) throw new Error(`No session found: ${sessionId}`);

    session.history.push(structuredClone(session.page) as PageRecord);
    session.page = applyMergePatch(session.page, patch);
    session.updatedAt = Date.now();

    const validation = await validatePageAsync(session.page);
    return {
      sessionId,
      valid: validation.valid,
      diagnostics: validation.diagnostics,
      historyDepth: session.history.length,
      sectionOrder: Array.isArray(session.page.sectionOrder) ? session.page.sectionOrder : [],
    };
  },
};

// ── undo_page_session ────────────────────────────────────────────────────────

export const undoPageSession: Tool = {
  def: {
    name: "undo_page_session",
    description: "Revert the last patch applied to a page session.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Session ID from open_page_session" },
      },
      required: ["sessionId"],
    },
  },
  run: async (args) => {
    const { sessionId } = args as { sessionId: string };
    const session = sessions.get(sessionId);
    if (!session) throw new Error(`No session found: ${sessionId}`);
    if (session.history.length === 0) throw new Error("Nothing to undo");

    session.page = session.history.pop()!;
    session.updatedAt = Date.now();

    const validation = await validatePageAsync(session.page);
    return {
      sessionId,
      valid: validation.valid,
      diagnostics: validation.diagnostics,
      historyDepth: session.history.length,
      sectionOrder: Array.isArray(session.page.sectionOrder) ? session.page.sectionOrder : [],
    };
  },
};

// ── preview_page_session ─────────────────────────────────────────────────────

export const previewPageSession: Tool = {
  def: {
    name: "preview_page_session",
    description:
      "Return the current in-memory page state without writing to disk. Use to inspect the accumulated result of patches before committing.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Session ID from open_page_session" },
      },
      required: ["sessionId"],
    },
  },
  run: async (args) => {
    const { sessionId } = args as { sessionId: string };
    const session = sessions.get(sessionId);
    if (!session) throw new Error(`No session found: ${sessionId}`);
    const validation = await validatePageAsync(session.page);
    return {
      sessionId,
      route: session.route,
      valid: validation.valid,
      diagnostics: validation.diagnostics,
      page: session.page,
    };
  },
};

// ── commit_page_session ──────────────────────────────────────────────────────

export const commitPageSession: Tool = {
  def: {
    name: "commit_page_session",
    description:
      "Write the current in-memory page state to disk and close the session. Runs a strict-load validation (same pipeline as the app: presets, modules, section hydration, cross-ref checks) after writing. If strict-load fails and force is not set, the original file is restored. Use force: true only as a last resort.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Session ID from open_page_session" },
        force: {
          type: "boolean",
          description: "Write even if strict-load validation fails (not recommended)",
        },
      },
      required: ["sessionId"],
    },
  },
  run: async (args) => {
    const { sessionId, force } = args as { sessionId: string; force?: boolean };
    const session = sessions.get(sessionId);
    if (!session) throw new Error(`No session found: ${sessionId}`);

    // Attempt strict-load: write → strict-load → rollback on failure.
    // We skip the schema-only pre-check here: pages that reference global presets
    // legitimately fail schema-only validation because preset resolution requires
    // the full route-aware loader. Strict-load catches everything schema-only would
    // and more, so it is always the authoritative gate.
    const slugSegments = filePathToSlugSegments(session.filePath);
    const newContent = JSON.stringify(session.page, null, 2) + "\n";

    // Save original for rollback if we can derive a strict-load path.
    let originalContent: string | null = null;
    if (slugSegments) {
      try {
        originalContent = await readFile(session.filePath, "utf-8");
      } catch (err) {
        console.warn(
          "[pb-mcp] Failed to read file for rollback (may be new page)",
          session.filePath,
          err
        );
      }
    }

    // Write the session content to disk.
    await writeFile(session.filePath, newContent, "utf-8");

    // If the file is a routable page, verify it survives the strict load pipeline.
    if (slugSegments) {
      try {
        await loadPeblorByPathAsync(slugSegments);
      } catch (err) {
        if (!force) {
          // Rollback: restore original content (or delete if it was a new file).
          if (originalContent !== null) {
            await writeFile(session.filePath, originalContent, "utf-8");
          }
          const message = err instanceof Error ? err.message : String(err);
          return {
            sessionId,
            written: false,
            validationMode: "strict-load",
            valid: false,
            diagnostics: [{ severity: "error", code: "PB_STRICT_LOAD_FAILED", message }],
            hint: "The page failed strict-load validation (presets, modules, section hydration, cross-ref checks). Fix the errors above and try again, or use force: true to write anyway.",
          };
        }
        // force: true — leave the file as written, proceed.
      }
    }

    sessions.delete(sessionId);

    if (!slugSegments) {
      const schemaValidation = await validatePageAsync(session.page);
      return {
        sessionId,
        written: true,
        validationMode: "schema-only",
        valid: schemaValidation.valid,
        diagnostics: schemaValidation.valid ? [] : schemaValidation.diagnostics,
        filePath: session.filePath,
      };
    }

    return {
      sessionId,
      written: true,
      validationMode: "strict-load",
      valid: true,
      filePath: session.filePath,
    };
  },
};

// ── close_page_session ───────────────────────────────────────────────────────

export const closePageSession: Tool = {
  def: {
    name: "close_page_session",
    description: "Discard a page session without writing to disk.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Session ID from open_page_session" },
      },
      required: ["sessionId"],
    },
  },
  run: async (args) => {
    const { sessionId } = args as { sessionId: string };
    const existed = sessions.delete(sessionId);
    return { sessionId, closed: existed };
  },
};

// ── list_page_sessions ───────────────────────────────────────────────────────

export const listPageSessions: Tool = {
  def: {
    name: "list_page_sessions",
    description: "List all currently open page sessions in this MCP server process.",
    inputSchema: { type: "object", properties: {} },
  },
  run: async () => {
    const list = [...sessions.entries()].map(([id, s]) => ({
      sessionId: id,
      route: s.route,
      historyDepth: s.history.length,
      createdAt: new Date(s.createdAt).toISOString(),
      updatedAt: new Date(s.updatedAt).toISOString(),
    }));
    return { sessions: list, total: list.length };
  },
};

// ── inspect_session ──────────────────────────────────────────────────────────

export const inspectPageSession: Tool = {
  def: {
    name: "inspect_session",
    description:
      "Return the current state of an open session together with a schema-only validation pass. " +
      "Default format is 'summary': shows changed paths and section order without dumping full pageJson. " +
      "Pass format: 'full' to include the complete pageJson. " +
      "Use this during iterative editing to verify state without committing to disk.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Session ID from open_page_session" },
        format: {
          type: "string",
          enum: ["summary", "full"],
          description:
            "Output format (default: 'summary'). Use 'full' to include the complete pageJson.",
        },
      },
      required: ["sessionId"],
    },
  },
  run: async (args) => {
    const { sessionId, format = "summary" } = args as {
      sessionId: string;
      format?: "summary" | "full";
    };
    const session = sessions.get(sessionId);
    if (!session) throw new Error(`No session found: ${sessionId}`);

    const validation = await validatePageAsync(session.page);
    const base = {
      sessionId,
      route: session.route,
      filePath: session.filePath,
      patchCount: session.history.length,
      validationMode: "schema-only" as const,
      valid: validation.valid,
      diagnostics: validation.valid ? [] : validation.diagnostics,
      sectionOrder: Array.isArray(session.page.sectionOrder) ? session.page.sectionOrder : [],
    };

    if (format === "full") {
      return { ...base, pageJson: session.page };
    }

    // Summary mode: compute changed paths instead of dumping full JSON
    const changes = computeDiff(session.originalPage, session.page, "");
    const changedPaths = changes.map((c) => c.path);
    return { ...base, changedPaths, pageJson: null };
  },
};

// ── diff helper (shared by session_diff and inspect_session summary) ─────────

type DiffChange = {
  op: "replace" | "add" | "remove";
  path: string;
  from?: unknown;
  to?: unknown;
  value?: unknown;
  was?: unknown;
};

function truncateForDiff(val: unknown): unknown {
  if (typeof val === "string") return val.length > 100 ? val.slice(0, 100) + "…" : val;
  if (isRecord(val)) {
    const keys = Object.keys(val);
    if (keys.length > 5) {
      const truncated: Record<string, unknown> = {};
      for (const k of keys.slice(0, 5)) truncated[k] = (val as Record<string, unknown>)[k];
      truncated["…"] = `(${keys.length - 5} more keys)`;
      return truncated;
    }
  }
  return val;
}

function computeDiff(
  original: PageRecord,
  current: PageRecord,
  prefix: string,
  depth = 0
): DiffChange[] {
  if (depth > 8) return [];
  const changes: DiffChange[] = [];
  const allKeys = new Set([...Object.keys(original), ...Object.keys(current)]);

  for (const key of allKeys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const hasOrig = key in original;
    const hasCurr = key in current;

    if (!hasOrig) {
      changes.push({ op: "add", path, value: truncateForDiff(current[key]) });
    } else if (!hasCurr) {
      changes.push({ op: "remove", path, was: truncateForDiff(original[key]) });
    } else if (JSON.stringify(original[key]) !== JSON.stringify(current[key])) {
      if (isRecord(original[key]) && isRecord(current[key])) {
        changes.push(
          ...computeDiff(original[key] as PageRecord, current[key] as PageRecord, path, depth + 1)
        );
      } else {
        changes.push({
          op: "replace",
          path,
          from: truncateForDiff(original[key]),
          to: truncateForDiff(current[key]),
        });
      }
    }
  }

  return changes;
}

// ── session_diff ──────────────────────────────────────────────────────────────

export const sessionDiff: Tool = {
  def: {
    name: "session_diff",
    description:
      "Show exactly what has changed in an open session relative to the original file — " +
      "field-level diff, not a full JSON dump. Use this before commit to review changes.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Session ID from open_page_session" },
      },
      required: ["sessionId"],
    },
  },
  run: async (args) => {
    const { sessionId } = args as { sessionId: string };
    const session = sessions.get(sessionId);
    if (!session) throw new Error(`No session found: ${sessionId}`);

    const changes = computeDiff(session.originalPage, session.page, "");
    const adds = changes.filter((c) => c.op === "add").length;
    const removes = changes.filter((c) => c.op === "remove").length;
    const replaces = changes.filter((c) => c.op === "replace").length;

    const parts: string[] = [];
    if (replaces > 0) parts.push(`${replaces} field edit${replaces !== 1 ? "s" : ""}`);
    if (adds > 0) parts.push(`${adds} addition${adds !== 1 ? "s" : ""}`);
    if (removes > 0) parts.push(`${removes} removal${removes !== 1 ? "s" : ""}`);

    return {
      sessionId,
      route: session.route,
      patchCount: session.history.length,
      changeCount: changes.length,
      changes,
      summary: parts.length > 0 ? parts.join(", ") : "No changes",
    };
  },
};

// ── get_session_value / set_session_value ────────────────────────────────────

function getValueAtPath(obj: PageRecord, path: string): unknown {
  const parts = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") {
      throw new Error(`Path not found: "${path}" (stopped at "${part}")`);
    }
    const rec = current as Record<string, unknown>;
    if (!(part in rec)) {
      throw new Error(`Path not found: "${path}" (key "${part}" missing)`);
    }
    current = rec[part];
  }
  return current;
}

function buildNestedPatch(parts: string[], value: unknown): PageRecord {
  if (parts.length === 0) return value as PageRecord;
  const [head, ...rest] = parts;
  return { [head!]: buildNestedPatch(rest, value) };
}

export const getSessionValue: Tool = {
  def: {
    name: "get_session_value",
    description:
      "Read a single value at a dot-path in the current session state. " +
      "Faster than inspect_session for targeting specific fields. " +
      "Example path: 'definitions.hero.definitions.hero-title.text'",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Session ID from open_page_session" },
        path: {
          type: "string",
          description:
            "Dot-separated path to the value (e.g. 'title', 'definitions.hero.definitions.hero-title.text')",
        },
      },
      required: ["sessionId", "path"],
    },
  },
  run: async (args) => {
    const { sessionId, path } = args as { sessionId: string; path: string };
    const session = sessions.get(sessionId);
    if (!session) throw new Error(`No session found: ${sessionId}`);
    const value = getValueAtPath(session.page, path);
    return { sessionId, path, value };
  },
};

export const setSessionValue: Tool = {
  def: {
    name: "set_session_value",
    description:
      "Set a single value at a dot-path in the current session state and validate immediately. " +
      "Equivalent to patch_page_session but accepts a path + value instead of a full merge patch. " +
      "Pushes to history so undo works. Nothing is written to disk. " +
      "Example path: 'definitions.hero.definitions.hero-title.text'",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Session ID from open_page_session" },
        path: {
          type: "string",
          description:
            "Dot-separated path to set (e.g. 'definitions.hero.definitions.hero-title.text')",
        },
        value: {
          description: "The value to set at the path",
        },
      },
      required: ["sessionId", "path", "value"],
    },
  },
  run: async (args) => {
    const { sessionId, path, value } = args as { sessionId: string; path: string; value: unknown };
    const session = sessions.get(sessionId);
    if (!session) throw new Error(`No session found: ${sessionId}`);

    // Capture previous value (best-effort)
    let previousValue: unknown = undefined;
    try {
      previousValue = getValueAtPath(session.page, path);
    } catch (err) {
      console.warn("[pb-mcp] Failed to get previous value for path (may be new key)", path, err);
    }

    const parts = path
      .replace(/\[(\d+)\]/g, ".$1")
      .split(".")
      .filter(Boolean);
    const patch = buildNestedPatch(parts, value) as PageRecord;

    session.history.push(structuredClone(session.page) as PageRecord);
    session.page = applyMergePatch(session.page, patch);
    session.updatedAt = Date.now();

    const validation = await validatePageAsync(session.page);
    return {
      sessionId,
      path,
      previousValue,
      newValue: value,
      valid: validation.valid,
      diagnostics: validation.valid ? [] : validation.diagnostics,
      historyDepth: session.history.length,
    };
  },
};

// ── Session persistence helpers (used by session-persistence.ts) ─────────────

export function getSession(
  sessionId: string
): { route: string; filePath: string; current: PageRecord; history: PageRecord[] } | undefined {
  const s = sessions.get(sessionId);
  if (!s) return undefined;
  return { route: s.route, filePath: s.filePath, current: s.page, history: s.history };
}

export function restoreSession(
  sessionId: string,
  route: string,
  filePath: string,
  current: unknown,
  history: unknown[]
): void {
  const restoredPage = current as PageRecord;
  sessions.set(sessionId, {
    route,
    filePath,
    page: restoredPage,
    originalPage: structuredClone(restoredPage) as PageRecord,
    history: history as PageRecord[],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

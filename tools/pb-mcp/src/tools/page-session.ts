import { writeFile } from "node:fs/promises";
import { createPbClient } from "@pb/sdk";
import { CONTRACT_VERSION } from "@pb/contracts";
import type { Tool } from "../types.js";
import { findPage } from "../lib/fs.js";

type PageRecord = Record<string, unknown>;

type Session = {
  route: string;
  filePath: string;
  page: PageRecord;
  history: PageRecord[];
  createdAt: number;
  updatedAt: number;
};

// In-process session store — survives across tool calls for the lifetime of the MCP server
const sessions = new Map<string, Session>();

const pb = createPbClient({ contractVersion: CONTRACT_VERSION });

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

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
    sessions.set(sessionId, {
      route,
      filePath,
      page: content as PageRecord,
      history: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const validation = await pb.validate(content);
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

    session.history.push({ ...session.page });
    session.page = applyMergePatch(session.page, patch);
    session.updatedAt = Date.now();

    const validation = await pb.validate(session.page);
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

    const validation = await pb.validate(session.page);
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
    const validation = await pb.validate(session.page);
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
      "Write the current in-memory page state to disk and close the session. Refuses to write if the page is invalid unless force: true.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Session ID from open_page_session" },
        force: {
          type: "boolean",
          description: "Write even if validation fails (not recommended)",
        },
      },
      required: ["sessionId"],
    },
  },
  run: async (args) => {
    const { sessionId, force } = args as { sessionId: string; force?: boolean };
    const session = sessions.get(sessionId);
    if (!session) throw new Error(`No session found: ${sessionId}`);

    const validation = await pb.validate(session.page);
    if (!validation.valid && !force) {
      return {
        sessionId,
        written: false,
        valid: false,
        diagnostics: validation.diagnostics,
        hint: "Fix validation errors or use force: true to write anyway",
      };
    }

    await writeFile(session.filePath, JSON.stringify(session.page, null, 2) + "\n", "utf-8");
    sessions.delete(sessionId);

    return {
      sessionId,
      written: true,
      valid: validation.valid,
      filePath: session.filePath,
      diagnostics: validation.diagnostics,
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

// ── Session persistence helpers (used by session-persistence.ts) ─────────────

export function getSession(
  sessionId: string
): { route: string; current: PageRecord; history: PageRecord[] } | undefined {
  const s = sessions.get(sessionId);
  if (!s) return undefined;
  return { route: s.route, current: s.page, history: s.history };
}

export function restoreSession(
  sessionId: string,
  route: string,
  current: unknown,
  history: unknown[]
): void {
  sessions.set(sessionId, {
    route,
    filePath: "",
    page: current as PageRecord,
    history: history as PageRecord[],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

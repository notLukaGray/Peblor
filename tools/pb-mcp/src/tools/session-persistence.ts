import fs from "node:fs";
import path from "node:path";
import type { Tool } from "../types.js";

// Import the in-memory session store from page-session
// Sessions are stored as a module-level Map in page-session.ts.
// We serialize/restore them via JSON checkpoint files.

type SessionCheckpoint = {
  sessionId: string;
  route: string;
  current: unknown;
  history: unknown[];
  savedAt: string;
};

export const exportSession: Tool = {
  def: {
    name: "export_session",
    description:
      "Serialize an open page session (current JSON state + undo history) to a .pb-session.json file for durability across MCP reconnects.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Session ID from open_page_session" },
        outPath: {
          type: "string",
          description: "File path to write the session checkpoint (default: .pb-session-<id>.json)",
        },
      },
      required: ["sessionId"],
    },
  },
  run: async (args) => {
    const { sessionId, outPath } = args as { sessionId: string; outPath?: string };

    // Dynamically import the session store from page-session
    const { getSession } = (await import("./page-session.js")) as {
      getSession?: (
        id: string
      ) => { route: string; current: unknown; history: unknown[] } | undefined;
    };

    if (!getSession) {
      throw new Error("Session store not available. Ensure page-session.ts exports getSession.");
    }

    const session = getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const checkpoint: SessionCheckpoint = {
      sessionId,
      route: session.route,
      current: session.current,
      history: session.history,
      savedAt: new Date().toISOString(),
    };

    const filePath = outPath ?? `.pb-session-${sessionId}.json`;
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

    fs.writeFileSync(absolutePath, `${JSON.stringify(checkpoint, null, 2)}\n`, "utf-8");
    return { status: "ok", sessionId, file: absolutePath, savedAt: checkpoint.savedAt };
  },
};

export const importSession: Tool = {
  def: {
    name: "import_session",
    description:
      "Restore a page session from a .pb-session.json checkpoint file created by export_session.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the .pb-session.json checkpoint file" },
      },
      required: ["path"],
    },
  },
  run: async (args) => {
    const { path: filePath } = args as { path: string };
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Session file not found: ${filePath}`);
    }

    let checkpoint: SessionCheckpoint;
    try {
      checkpoint = JSON.parse(fs.readFileSync(absolutePath, "utf-8")) as SessionCheckpoint;
    } catch (e) {
      throw new Error(
        `Failed to parse session file: ${e instanceof Error ? e.message : String(e)}`
      );
    }

    const { restoreSession } = (await import("./page-session.js")) as {
      restoreSession?: (id: string, route: string, current: unknown, history: unknown[]) => void;
    };

    if (!restoreSession) {
      throw new Error(
        "Session restore not available. Ensure page-session.ts exports restoreSession."
      );
    }

    restoreSession(checkpoint.sessionId, checkpoint.route, checkpoint.current, checkpoint.history);

    return {
      status: "ok",
      sessionId: checkpoint.sessionId,
      route: checkpoint.route,
      restoredAt: new Date().toISOString(),
      originalSavedAt: checkpoint.savedAt,
    };
  },
};

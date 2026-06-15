import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import { openPageSession, commitPageSession, closePageSession } from "./page-session.js";
import { PAGE_DATA_DIR } from "@pb/core/loader";

// This test writes to a real page file then restores it. We use "profile" as the
// simplest page (single index.json, no sidecar sections, few presets).
const TEST_ROUTE = "/profile";
const TEST_FILE = path.join(PAGE_DATA_DIR, "profile", "index.json");

describe("commit_page_session — strict-load gating", () => {
  // Each test opens and closes its own session. Track any leftover sessions for cleanup.
  const openSessions: string[] = [];
  // Snapshot the file before each test suite run so we can restore it afterward.
  const originalContent = fs.readFileSync(TEST_FILE, "utf-8");

  afterEach(async () => {
    // Close any sessions left open by a failing test.
    for (const id of openSessions.splice(0)) {
      try {
        await closePageSession.run({ sessionId: id });
      } catch {}
    }
    // Restore the file to its pre-test state (e.g. after force-write tests).
    fs.writeFileSync(TEST_FILE, originalContent, "utf-8");
  });

  it("commits a valid page and confirms strict-load validation", async () => {
    const opened = (await openPageSession.run({ route: TEST_ROUTE })) as { sessionId: string };
    openSessions.push(opened.sessionId);

    // Commit without any changes — should succeed.
    const result = (await commitPageSession.run({ sessionId: opened.sessionId })) as {
      written: boolean;
      validationMode: string;
      valid: boolean;
    };

    expect(result.written).toBe(true);
    expect(result.validationMode).toBe("strict-load");
    // The opened session is now closed by commit — remove from cleanup list.
    openSessions.splice(openSessions.indexOf(opened.sessionId), 1);
  });

  it("blocks commit and rolls back when session content breaks strict-load", async () => {
    const originalContent = fs.readFileSync(TEST_FILE, "utf-8");

    const opened = (await openPageSession.run({ route: TEST_ROUTE })) as { sessionId: string };
    openSessions.push(opened.sessionId);

    // Apply a patch that makes the page reference a nonexistent sectionOrder key.
    const { patchPageSession } = await import("./page-session.js");
    await patchPageSession.run({
      sessionId: opened.sessionId,
      patch: { sectionOrder: ["__definitely_missing_section_key__"] },
    });

    const result = (await commitPageSession.run({ sessionId: opened.sessionId })) as {
      written: boolean;
      validationMode: string;
      valid: boolean;
      diagnostics: Array<{ message: string }>;
      hint: string;
    };

    // Must refuse to write.
    expect(result.written).toBe(false);
    expect(result.validationMode).toBe("strict-load");
    expect(result.valid).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.hint).toBeTruthy();

    // The file on disk must still be the original (rollback worked).
    const diskContent = fs.readFileSync(TEST_FILE, "utf-8");
    expect(diskContent).toBe(originalContent);

    // Session must still be open (not consumed by a failed commit).
    const closed = (await closePageSession.run({ sessionId: opened.sessionId })) as {
      closed: boolean;
    };
    expect(closed.closed).toBe(true);
    openSessions.splice(openSessions.indexOf(opened.sessionId), 1);
  });

  it("force: true writes the file even when strict-load would fail", async () => {
    const opened = (await openPageSession.run({ route: TEST_ROUTE })) as { sessionId: string };
    openSessions.push(opened.sessionId);

    const { patchPageSession } = await import("./page-session.js");
    await patchPageSession.run({
      sessionId: opened.sessionId,
      patch: { sectionOrder: ["__definitely_missing_section_key__"] },
    });

    const result = (await commitPageSession.run({
      sessionId: opened.sessionId,
      force: true,
    })) as { written: boolean };

    expect(result.written).toBe(true);
    openSessions.splice(openSessions.indexOf(opened.sessionId), 1);
    // afterEach restores the file to its pre-test content.
  });
});

import fs from "node:fs";
import { validatePage } from "@pb/core/validate";
import { findPagesDir, findPageFile, readPageJson } from "../lib/pages.js";
import type { CommandIo } from "./types.js";

type SetAnalyticsArgs = {
  route?: string;
  enabled?: boolean;
  event?: string;
  clear: boolean;
  write: boolean;
  asJson: boolean;
  help: boolean;
};

function parseSetAnalyticsArgs(args: string[]): SetAnalyticsArgs {
  const asJson = args.includes("--json");
  const write = args.includes("--write");
  const clear = args.includes("--clear");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();

  function flag(name: string): string | undefined {
    const i = args.indexOf(name);
    if (i < 0) return undefined;
    consumed.add(i);
    consumed.add(i + 1);
    return args[i + 1];
  }

  const enabledStr = flag("--enabled");
  const event = flag("--event");
  const enabled =
    enabledStr !== undefined
      ? enabledStr !== "false"
      : args.includes("--enabled")
        ? true
        : undefined;
  if (args.includes("--enabled")) {
    const i = args.indexOf("--enabled");
    consumed.add(i);
  }
  for (let i = 0; i < args.length; i++) {
    if (["--json", "--write", "--clear", "--help", "-h"].includes(args[i]!)) consumed.add(i);
  }

  const positional = args.filter((_, i) => !consumed.has(i));
  return { route: positional[0], enabled, event, clear, write, asJson, help };
}

export async function runSetAnalytics(args: string[], io: CommandIo): Promise<number> {
  const { route, enabled, event, clear, write, asJson, help } = parseSetAnalyticsArgs(args);

  if (help) {
    io.printText(
      "Usage: pb-cli set-analytics <route> --enabled [--event page_view] [--clear] [--write] [--json]"
    );
    return 0;
  }

  if (!route) {
    io.printErrorText("Error: route is required.");
    return 2;
  }

  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages not found. Run from the project root.";
    if (asJson) io.printErrorJson({ command: "set-analytics", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const file = findPageFile(pagesDir, route);
  if (!file) {
    const msg = `Page not found: ${route}`;
    if (asJson) io.printErrorJson({ command: "set-analytics", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 1;
  }

  const readResult = readPageJson(file);
  if (!readResult.ok) {
    if (asJson)
      io.printErrorJson({ command: "set-analytics", status: "error", message: readResult.error });
    else io.printErrorText(`Error: ${readResult.error}`);
    return 1;
  }

  const updated: Record<string, unknown> = { ...readResult.data };

  if (clear) {
    delete updated.analytics;
  } else {
    const analyticsConfig: Record<string, unknown> = {};
    if (enabled !== undefined) analyticsConfig.enabled = enabled;
    if (event) analyticsConfig.event = event;
    if (Object.keys(analyticsConfig).length === 0) {
      io.printErrorText("Error: specify --enabled, --event, or --clear.");
      return 2;
    }
    updated.analytics = analyticsConfig;
  }

  const validated = validatePage(updated);
  if (!validated.valid) {
    const diagnostics = validated.diagnostics.map((d) => ({
      severity: d.severity,
      path: d.path,
      message: d.message,
    }));
    if (asJson)
      io.printErrorJson({
        command: "set-analytics",
        status: "error",
        message: "Validation failed.",
        diagnostics,
      });
    else io.printErrorText("Validation failed.");
    return 1;
  }

  if (write) {
    fs.writeFileSync(file, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  }

  if (asJson) {
    io.printJson({
      command: "set-analytics",
      status: "ok",
      route,
      file,
      written: write,
      analytics: updated.analytics ?? null,
    });
  } else {
    const action = clear ? "cleared" : `set to ${JSON.stringify(updated.analytics)}`;
    io.printText(`Analytics ${action}: ${route}${write ? " (written)" : " (dry-run)"}`);
  }
  return 0;
}

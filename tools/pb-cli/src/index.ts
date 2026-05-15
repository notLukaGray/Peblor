#!/usr/bin/env npx tsx

import { CONTRACT_VERSION } from "@pb/contracts";
import { createPbClient } from "@pb/sdk";
import { runConformance } from "./commands/conformance.js";
import { runValidate, runDiff, runMigrate } from "./commands/core-ops.js";
import { runExplain } from "./commands/explain.js";
import { runProbe } from "./commands/probe.js";
import { runPropose } from "./commands/propose.js";
import { runDoctor } from "./commands/doctor.js";
import { runScaffold } from "./commands/scaffold.js";
import type { CommandIo, CliResult } from "./commands/types.js";

function printJson(result: CliResult): void {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

function printErrorJson(result: CliResult): void {
  process.stderr.write(`${JSON.stringify(result, null, 2)}\n`);
}

function printText(text: string): void {
  process.stdout.write(`${text}\n`);
}

function printErrorText(text: string): void {
  process.stderr.write(`${text}\n`);
}

function wantsHelpFlag(token: string | undefined): boolean {
  return token === "-h" || token === "--help";
}

function printUsage(): void {
  printText("Usage: pb-cli <command> [...args]");
  printText("");
  printText("Commands:");
  printText("  validate <file>");
  printText("  diff <file-a> <file-b>");
  printText("  migrate <file> [--from <version>] [--to <version>]");
  printText("  conformance [fixtures-dir]");
  printText(
    "  explain <cluster-id> [--fields] [--examples] [--example <index|path-fragment>] [--json]"
  );
  printText("  explain --all [--kind <element|trigger|motion|section|background>] [--json]");
  printText(
    '  probe [--kind <element|trigger|motion|section|background>] [--strict-kind] [--strict] [--top <n>] [--verbose] [--json] "<intent>"'
  );
  printText("  doctor <page-index.json> [--stage <load|validate|expand|resolve|assets>] [--json]");
  printText("  doctor --fragment <section-fragment.json> [--json]");
  printText(
    "  scaffold <route> [--out <file>] [--from <cluster-id|preset.json>] [--force] [--json]"
  );
  printText(
    '  propose new --intent "<intent>" [--kind <element|trigger|motion|section|background>]'
  );
  printText("  propose new --extend <cluster-id>");
  printText("  propose --check <proposal-file>");
  printText("  propose --check-all");
  printText("  propose list");
  printText("");
  printText("Use '<command> --help' for command-specific help.");
}

export async function runCli(argv = process.argv): Promise<number> {
  const [, , command, ...args] = argv;
  const pb = createPbClient({ contractVersion: CONTRACT_VERSION });
  const io: CommandIo = { printText, printJson, printErrorJson, printErrorText, printUsage };

  if (!command || command === "--help" || command === "-h") {
    printUsage();
    return 0;
  }

  switch (command) {
    case "validate":
      if (wantsHelpFlag(args[0])) {
        printUsage();
        return 0;
      }
      return args[0] ? runValidate(pb, io, args[0]) : (printUsage(), 2);
    case "diff":
      if (wantsHelpFlag(args[0]) || wantsHelpFlag(args[1])) {
        printUsage();
        return 0;
      }
      return args[0] && args[1] ? runDiff(pb, io, args[0], args[1]) : (printUsage(), 2);
    case "migrate":
      if (wantsHelpFlag(args[0])) {
        printUsage();
        return 0;
      }
      return args[0] ? runMigrate(pb, io, args[0], args.slice(1)) : (printUsage(), 2);
    case "conformance":
      return runConformance(pb, io, args[0]);
    case "explain":
      if (wantsHelpFlag(args[0])) {
        printUsage();
        return 0;
      }
      return args[0] ? runExplain(args[0], args.slice(1), io) : (printUsage(), 2);
    case "probe":
      return runProbe(args, io);
    case "propose":
      return runPropose(args, io);
    case "doctor":
      return runDoctor(args, io);
    case "scaffold":
      return runScaffold(args, io);
    default:
      printUsage();
      return 2;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().then(
    (exitCode) => process.exit(exitCode),
    (error) => {
      printErrorJson({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
        ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
      });
      process.exit(2);
    }
  );
}

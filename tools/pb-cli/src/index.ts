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
import { runSection } from "./commands/section.js";
import { runGrep } from "./commands/grep.js";
import { runWriteModal, runWriteModule } from "./commands/write-content.js";
import { runClonePage } from "./commands/clone-page.js";
import { runListAssets } from "./commands/list-assets.js";
import { runResolveAsset } from "./commands/resolve-asset.js";
import { runAuditAssets } from "./commands/audit-assets.js";
import { runAudit } from "./commands/audit.js";
import { runLint } from "./commands/lint.js";
import { runCheckRoutes } from "./commands/check-routes.js";
import { runListOverlays, runReadOverlay, runWriteOverlay } from "./commands/overlays.js";
import { runGeneratePage } from "./commands/generate-page.js";
import { runFillSection } from "./commands/fill-section.js";
import { runSetMetadata } from "./commands/set-metadata.js";
import { runSetAnalytics } from "./commands/set-analytics.js";
import { runListTags } from "./commands/list-tags.js";
import { runListProjectGroups } from "./commands/list-project-groups.js";
import { runSetPageTags } from "./commands/set-page-tags.js";
import { runRenameRoute } from "./commands/rename-route.js";
import { runExtractPreset } from "./commands/extract-preset.js";
import { runListUnusedPresets } from "./commands/list-unused-presets.js";
import { runBatchEdit } from "./commands/batch-edit.js";
import { runValidateAll } from "./commands/validate-all.js";
import { runSitemap } from "./commands/sitemap.js";
import { runListCapabilities } from "./commands/list-capabilities.js";
import { runValidateCapability } from "./commands/validate-capability.js";
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
  printText("  section list <route|file>");
  printText(
    "  section add <route|file> --key <key> --definition '<json>' [--after <key>] [--before <key>] [--write] [--json]"
  );
  printText("  section remove <route|file> --key <key> [--write] [--json]");
  printText("  section move <route|file> --key <key> --to <index> [--write] [--json]");
  printText("  grep [--type <type>] [--field <field>] [--value <val>] [--preset <id>] [--json]");
  printText("  write-modal <id> <file> [--force] [--json]");
  printText("  write-module <id> <file> [--force] [--json]");
  printText("");
  printText("AI Generation:");
  printText('  generate <route> --intent "..." [--dry-run] [--json]');
  printText('  fill-section <route> --key <key> --intent "..." [--write] [--json]');
  printText("");
  printText("Cross-Page:");
  printText('  clone <source-route> <dest-route> [--title "..."] [--force] [--json]');
  printText("  rename-route <old-route> <new-route> [--json]");
  printText("  extract-preset <route> --key <defKey> --preset-id <id> [--write] [--json]");
  printText("  list-unused-presets [--json]");
  printText("");
  printText("Assets:");
  printText("  list-assets [route] [--type image|video|vector] [--unresolved] [--json]");
  printText(
    "  resolve-asset <path> [--width n] [--height n] [--quality n] [--format webp] [--json]"
  );
  printText("  audit-assets [route] [--json]");
  printText("");
  printText("Diagnostics:");
  printText("  audit <route|--all> [--json]");
  printText("  lint <route|--all> [--json]");
  printText("  check-routes [--json]");
  printText("  validate-all [--fail-fast] [--json]");
  printText("");
  printText("Overlays:");
  printText("  list-overlays [--json]");
  printText("  read-overlay <id>");
  printText("  write-overlay <id> <file> [--force] [--json]");
  printText("");
  printText("Metadata & Config:");
  printText(
    '  set-metadata <route> [--title "..."] [--description "..."] [--visibility public] [--write] [--json]'
  );
  printText("  set-analytics <route> --enabled [--event page_view] [--clear] [--write] [--json]");
  printText("  set-page-tags <route> --tags '{...}' [--merge] [--write] [--json]");
  printText("");
  printText("Tags & Filters:");
  printText("  list-tags [--category <cat>] [--json]");
  printText("  list-project-groups [--json]");
  printText("");
  printText("Batch:");
  printText(
    "  batch-edit [--type <type>] [--field <f>] [--value <v>] --patch '{...}' [--write] [--dry-run] [--json]"
  );
  printText("  sitemap [--out sitemap.xml] [--format xml|json] [--json]");
  printText("");
  printText("Capabilities:");
  printText("  list-capabilities [--type importer|exporter|cmsAdapter] [--json]");
  printText("  validate-capability <file> [--json]");
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
    case "section":
      return runSection(args, io);
    case "grep":
      return runGrep(args, io);
    case "write-modal":
      return runWriteModal(args, io);
    case "write-module":
      return runWriteModule(args, io);
    // AI Generation
    case "generate":
      return runGeneratePage(args, io);
    case "fill-section":
      return runFillSection(args, io);
    // Cross-Page
    case "clone":
      return runClonePage(args, io);
    case "rename-route":
      return runRenameRoute(args, io);
    case "extract-preset":
      return runExtractPreset(args, io);
    case "list-unused-presets":
      return runListUnusedPresets(args, io);
    // Assets
    case "list-assets":
      return runListAssets(args, io);
    case "resolve-asset":
      return runResolveAsset(args, io);
    case "audit-assets":
      return runAuditAssets(args, io);
    // Diagnostics
    case "audit":
      return runAudit(args, io);
    case "lint":
      return runLint(args, io);
    case "check-routes":
      return runCheckRoutes(args, io);
    case "validate-all":
      return runValidateAll(args, io);
    // Overlays
    case "list-overlays":
      return runListOverlays(args, io);
    case "read-overlay":
      return runReadOverlay(args, io);
    case "write-overlay":
      return runWriteOverlay(args, io);
    // Metadata & Config
    case "set-metadata":
      return runSetMetadata(args, io);
    case "set-analytics":
      return runSetAnalytics(args, io);
    case "set-page-tags":
      return runSetPageTags(args, io);
    // Tags & Filters
    case "list-tags":
      return runListTags(args, io);
    case "list-project-groups":
      return runListProjectGroups(args, io);
    // Batch
    case "batch-edit":
      return runBatchEdit(args, io);
    case "sitemap":
      return runSitemap(args, io);
    // Capabilities
    case "list-capabilities":
      return runListCapabilities(args, io);
    case "validate-capability":
      return runValidateCapability(args, io);
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

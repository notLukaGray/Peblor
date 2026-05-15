import fs from "node:fs";
import path from "node:path";
import { load as loadYaml, dump as dumpYaml } from "js-yaml";
import { runProbe } from "./probe.js";
import type { CommandIo } from "./types.js";

type ProposalStatus = "open" | "accepted" | "rejected" | "superseded";
type ProposalKind = "new_cluster" | "extend_cluster";

type Proposal = {
  id: string;
  proposed_by: string;
  proposed_at: string;
  status: ProposalStatus;
  kind: ProposalKind;
  target: string | null;
  target_kind?: string;
  intent: string;
  existing_clusters_considered?: Array<{
    cluster_id: string;
    why_close: string;
    why_insufficient: string;
  }>;
  checks?: Record<string, boolean>;
};

const PROPOSALS_DIR = "proposals";

function slugifyIntent(intent: string): string {
  const base = intent
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (base || "proposal").slice(0, 60);
}

function proposalPath(slug: string): string {
  return path.join(process.cwd(), PROPOSALS_DIR, `${slug}.proposal.yaml`);
}

function readProposal(
  filePath: string
): { ok: true; value: Proposal } | { ok: false; error: string } {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = loadYaml(raw) as Proposal;
    if (!parsed || typeof parsed !== "object")
      return { ok: false, error: "Proposal is empty or invalid." };
    return { ok: true, value: parsed };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function looksGeneric(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("todo") ||
    lower.includes("fill in") ||
    lower.includes("placeholder") ||
    lower.includes("explain specifically why")
  );
}

function validateProposalShape(proposal: Proposal): string[] {
  const errors: string[] = [];
  if (!proposal.id || typeof proposal.id !== "string") errors.push("Missing required field: id");
  if (!proposal.proposed_by || typeof proposal.proposed_by !== "string")
    errors.push("Missing required field: proposed_by");
  if (!proposal.proposed_at || typeof proposal.proposed_at !== "string")
    errors.push("Missing required field: proposed_at");
  if (!["open", "accepted", "rejected", "superseded"].includes(String(proposal.status)))
    errors.push("Invalid status (must be open|accepted|rejected|superseded)");
  if (!["new_cluster", "extend_cluster"].includes(String(proposal.kind)))
    errors.push("Invalid kind (must be new_cluster|extend_cluster)");
  if (!proposal.intent || proposal.intent.trim().length < 10)
    errors.push("Intent is required and must be at least 10 chars");
  if (looksGeneric(proposal.intent ?? "")) errors.push("Intent appears to be placeholder text");

  if (proposal.kind === "new_cluster") {
    if (
      !Array.isArray(proposal.existing_clusters_considered) ||
      proposal.existing_clusters_considered.length === 0
    ) {
      errors.push(
        "new_cluster proposals require existing_clusters_considered with at least one entry"
      );
    } else {
      for (const [idx, item] of proposal.existing_clusters_considered.entries()) {
        if (!item.cluster_id)
          errors.push(`existing_clusters_considered[${idx}] missing cluster_id`);
        if (!item.why_close || item.why_close.trim().length < 10)
          errors.push(`existing_clusters_considered[${idx}] why_close too short`);
        if (!item.why_insufficient || item.why_insufficient.trim().length < 150) {
          errors.push(`existing_clusters_considered[${idx}] why_insufficient must be >= 150 chars`);
        }
        if (looksGeneric(item.why_insufficient ?? "")) {
          errors.push(
            `existing_clusters_considered[${idx}] why_insufficient looks like placeholder text`
          );
        }
      }
    }
  }
  return errors;
}

function parseProbeMatches(
  json: unknown
): Array<{ cluster_id: string; why_close: string; why_insufficient: string }> {
  if (!json || typeof json !== "object") return [];
  const matches = Array.isArray((json as { matches?: unknown[] }).matches)
    ? (json as { matches: unknown[] }).matches
    : [];
  const near = Array.isArray((json as { near_misses?: unknown[] }).near_misses)
    ? (json as { near_misses: unknown[] }).near_misses
    : [];
  const rows = [...matches, ...near]
    .map((row) => {
      const cluster_id =
        typeof (row as { cluster_id?: unknown }).cluster_id === "string"
          ? String((row as { cluster_id: string }).cluster_id)
          : "";
      return cluster_id
        ? {
            cluster_id,
            why_close: "Probe returned this as a match/near-miss for the intended behavior.",
            why_insufficient:
              "[DRAFT REQUIRED] Explain specifically why this existing cluster cannot safely express the desired behavior without overloading its semantic scope. Include concrete axis/field mismatch, composition mismatch, and runtime implications.",
          }
        : null;
    })
    .filter(
      (x): x is { cluster_id: string; why_close: string; why_insufficient: string } => x !== null
    );

  const dedup = new Map<
    string,
    { cluster_id: string; why_close: string; why_insufficient: string }
  >();
  for (const row of rows) if (!dedup.has(row.cluster_id)) dedup.set(row.cluster_id, row);
  return [...dedup.values()];
}

async function runProbeJson(
  intent: string,
  kind?: string
): Promise<{ exit: number; payload: unknown }> {
  let payload: unknown = null;
  const captureIo: CommandIo = {
    printText: () => undefined,
    printUsage: () => undefined,
    printErrorText: () => undefined,
    printErrorJson: (result) => {
      payload = result;
    },
    printJson: (result) => {
      payload = result;
    },
  };
  const args = [intent, "--top", "5", "--json", ...(kind ? ["--kind", kind] : [])];
  const exit = await runProbe(args, captureIo);
  return { exit, payload };
}

function hasBundlingSmell(intent: string): boolean {
  const lower = intent.toLowerCase();
  return lower.includes(" and ") || lower.includes(",") || lower.includes(";");
}

async function scaffoldNew(
  intent: string,
  io: CommandIo,
  kind?: string,
  force = false
): Promise<number> {
  if (!intent) {
    io.printUsage();
    return 2;
  }
  fs.mkdirSync(path.join(process.cwd(), PROPOSALS_DIR), { recursive: true });
  const { exit, payload: probeJson } = await runProbeJson(intent, kind);
  if (exit !== 0) {
    io.printErrorJson({
      error: "Probe failed; cannot record cluster matches for this proposal.",
      ...(probeJson && typeof probeJson === "object" ? { details: probeJson as object } : {}),
    });
    return 1;
  }
  const considered = parseProbeMatches(probeJson);
  const slug = slugifyIntent(intent);
  const filePath = proposalPath(slug);

  if (!force && fs.existsSync(filePath)) {
    io.printErrorJson({
      error: `Proposal already exists: ${path.relative(process.cwd(), filePath)}`,
      hint: "Use --force to overwrite.",
    });
    return 1;
  }

  const proposal: Proposal = {
    id: `proposal.${slug}`,
    proposed_by: process.env.USER || "unknown",
    proposed_at: new Date().toISOString().slice(0, 10),
    status: "open",
    kind: "new_cluster",
    target: null,
    intent,
    ...(kind ? { target_kind: kind } : {}),
    existing_clusters_considered: considered,
    checks: {
      probe_addressed: false,
      contract_parses: false,
      example_validates: false,
      intent_file_present: false,
    },
  };

  fs.writeFileSync(filePath, dumpYaml(proposal, { lineWidth: 120 }), "utf8");
  io.printJson({
    command: "propose",
    action: "new",
    file: path.relative(process.cwd(), filePath),
    considered_clusters: considered.map((c) => c.cluster_id),
    ...(kind ? { kind } : {}),
    ...(hasBundlingSmell(intent)
      ? {
          warnings: [
            "Intent appears multi-concern (contains 'and' or list punctuation). Split into single-concern intents.",
          ],
        }
      : {}),
    next: [
      `Fill why_insufficient for each existing cluster (>=150 chars).`,
      `Set intended id/kind details and contract sketch.`,
      `Run: pb-cli propose --check ${path.relative(process.cwd(), filePath)}`,
    ],
  });
  return 0;
}

function listProposalFiles(): string[] {
  const dir = path.join(process.cwd(), PROPOSALS_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".proposal.yaml"))
    .map((name) => path.join(dir, name))
    .sort((a, b) => a.localeCompare(b));
}

async function checkOne(
  filePath: string
): Promise<{ file: string; valid: boolean; errors: string[] }> {
  const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const read = readProposal(absolute);
  if (!read.ok)
    return {
      file: path.relative(process.cwd(), absolute),
      valid: false,
      errors: ["error" in read ? read.error : "Failed to read proposal"],
    };
  const errors = validateProposalShape(read.value);

  if (
    read.value.kind === "new_cluster" &&
    read.value.intent &&
    Array.isArray(read.value.existing_clusters_considered)
  ) {
    const { exit, payload: probeJson } = await runProbeJson(read.value.intent);
    if (exit !== 0) {
      errors.push(
        "Probe failed while validating existing_clusters_considered against the current intent."
      );
    } else {
      const expected = new Set(parseProbeMatches(probeJson).map((row) => row.cluster_id));
      const provided = new Set(
        read.value.existing_clusters_considered.map((row) => row.cluster_id)
      );
      for (const clusterId of expected) {
        if (!provided.has(clusterId))
          errors.push(`existing_clusters_considered is missing probe result: ${clusterId}`);
      }
    }
  }

  return { file: path.relative(process.cwd(), absolute), valid: errors.length === 0, errors };
}

export async function runPropose(args: string[], io: CommandIo): Promise<number> {
  const [subcommand, ...rest] = args;

  if (subcommand === "--help" || subcommand === "-h" || !subcommand) {
    io.printText("Usage: pb-cli propose <subcommand> [...args]");
    io.printText("");
    io.printText("Subcommands:");
    io.printText(
      '  new --intent "<intent>" [--kind <element|trigger|motion|section|background>] [--force]'
    );
    io.printText("  new --extend <cluster-id> [--force]");
    io.printText("  --check <proposal-file>");
    io.printText("  --check-all");
    io.printText("  list");
    return 0;
  }

  if (subcommand === "new") {
    const intentIndex = rest.indexOf("--intent");
    const extendIndex = rest.indexOf("--extend");
    const kindIndex = rest.indexOf("--kind");
    const force = rest.includes("--force");
    const kind = kindIndex >= 0 ? rest[kindIndex + 1] : undefined;
    if (extendIndex >= 0) {
      fs.mkdirSync(path.join(process.cwd(), PROPOSALS_DIR), { recursive: true });
      const target = rest[extendIndex + 1];
      if (!target) {
        io.printUsage();
        return 2;
      }
      const slug = `extend-${target.replace(/[^a-zA-Z0-9.]+/g, "-")}`.toLowerCase();
      const filePath = proposalPath(slug);

      if (!force && fs.existsSync(filePath)) {
        io.printErrorJson({
          error: `Proposal already exists: ${path.relative(process.cwd(), filePath)}`,
          hint: "Use --force to overwrite.",
        });
        return 1;
      }

      const proposal: Proposal = {
        id: `proposal.${slug}`,
        proposed_by: process.env.USER || "unknown",
        proposed_at: new Date().toISOString().slice(0, 10),
        status: "open",
        kind: "extend_cluster",
        target,
        intent: `[DRAFT REQUIRED] Describe extension intent for ${target}`,
        checks: {
          probe_addressed: true,
          contract_parses: false,
          example_validates: false,
          intent_file_present: false,
        },
      };
      fs.writeFileSync(filePath, dumpYaml(proposal, { lineWidth: 120 }), "utf8");
      io.printJson({
        command: "propose",
        action: "new-extend",
        file: path.relative(process.cwd(), filePath),
        target,
      });
      return 0;
    }
    const intent =
      intentIndex >= 0
        ? rest
            .slice(intentIndex + 1)
            .join(" ")
            .trim()
        : rest.join(" ").trim();
    return scaffoldNew(intent, io, kind, force);
  }

  if (subcommand === "--check") {
    const file = rest[0];
    if (!file) {
      io.printUsage();
      return 2;
    }
    const result = await checkOne(file);
    const payload = { command: "propose", action: "check", ...result };
    if (result.valid) {
      io.printJson(payload);
      return 0;
    }
    io.printErrorJson(payload);
    return 1;
  }

  if (subcommand === "--check-all") {
    const files = listProposalFiles();
    const results = await Promise.all(files.map((file) => checkOne(file)));
    const valid = results.every((row) => row.valid);
    const payload = {
      command: "propose",
      action: "check-all",
      total: results.length,
      valid,
      results,
    };
    if (valid) {
      io.printJson(payload);
      return 0;
    }
    io.printErrorJson(payload);
    return 1;
  }

  if (subcommand === "list") {
    const rows = listProposalFiles().map((file) => {
      const read = readProposal(file);
      if (!read.ok)
        return { file: path.relative(process.cwd(), file), status: "invalid", id: "unknown" };
      return {
        file: path.relative(process.cwd(), file),
        id: read.value.id,
        status: read.value.status,
        kind: read.value.kind,
      };
    });
    io.printJson({ command: "propose", action: "list", total: rows.length, proposals: rows });
    return 0;
  }

  io.printUsage();
  return 2;
}

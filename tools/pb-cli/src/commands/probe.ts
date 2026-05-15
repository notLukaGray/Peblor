import { loadCatalog, type CatalogEntry } from "@pb/catalog";
import { schemaTypeHint } from "./explain-schema.js";
import { parseProbeArgs } from "./probe-args.js";
import { bestGap } from "./probe-gaps.js";
import type { CommandIo } from "./types.js";

type ProbeTier = "match" | "near";
type ProbeConfidence = "high" | "medium" | "low";
type ProbeRow = {
  tier: ProbeTier;
  cluster_id: string;
  confidence: ProbeConfidence;
  score: number;
  rationale: string[];
  suggested_config?: Record<string, unknown>;
  augmenting_clusters?: Array<{ cluster_id: string; purpose: string }>;
  gap?: string;
};

type IntentHints = { interaction: boolean; layout: boolean; background: boolean };

type CatalogIndex = {
  byId: Set<string>;
};

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "with",
]);
const PROBE_MATCH_THRESHOLD = 12;

function tokenize(input: string): string[] {
  return Array.from(
    new Set(
      input
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 1 && !STOPWORDS.has(p))
    )
  );
}

function confidenceFromScore(score: number): ProbeConfidence {
  if (score >= 18) return "high";
  if (score >= 10) return "medium";
  return "low";
}
function detectHints(tokens: string[]): IntentHints {
  const interaction = tokens.some((token) => ["hover", "click", "tap", "drag"].includes(token));
  const layout = tokens.some((token) =>
    ["grid", "gallery", "cards", "list", "carousel"].includes(token)
  );
  const background = tokens.some((token) => ["background", "backdrop", "gradient"].includes(token));
  return { interaction, layout, background };
}

function hasAnyToken(tokens: string[], candidates: string[]): boolean {
  return candidates.some((candidate) => tokens.some((token) => token.includes(candidate)));
}

function buildCatalogIndex(entries: CatalogEntry[]): CatalogIndex {
  return {
    byId: new Set(entries.map((entry) => entry.id)),
  };
}

function isStructuralCluster(id: string): boolean {
  return id.startsWith("section.") || id.startsWith("module.");
}
function matchesKind(entry: CatalogEntry, requestedKind?: string): boolean {
  if (!requestedKind) return true;
  if (requestedKind === "trigger") return entry.kind === "trigger";
  if (requestedKind === "motion" || requestedKind === "motion-preset")
    return entry.id.startsWith("motion.");
  return entry.id.startsWith(`${requestedKind}.`);
}

function isAllowedKind(kind?: string): boolean {
  if (!kind) return true;
  return ["element", "trigger", "motion", "section", "background", "motion-preset"].includes(kind);
}

function scoreEntry(entry: CatalogEntry, tokens: string[]): { score: number; rationale: string[] } {
  let score = 0;
  const rationale: string[] = [];
  const idAndText = [
    entry.id,
    entry.feels_like,
    ...entry.not_this_if,
    ...entry.covers.map((c) => c.description),
    ...entry.axes.map((a) => a.name),
  ]
    .join("\n")
    .toLowerCase();

  for (const token of tokens) {
    let matchedPositive = false;
    if (entry.id.toLowerCase().includes(token)) {
      score += 8;
      rationale.push(`id:${token}`);
      matchedPositive = true;
      continue;
    }
    if (entry.axes.some((a) => a.name.toLowerCase().includes(token))) {
      score += 5;
      rationale.push(`axis:${token}`);
      matchedPositive = true;
      continue;
    }
    if (entry.covers.some((c) => c.description.toLowerCase().includes(token))) {
      score += 4;
      rationale.push(`covers:${token}`);
      matchedPositive = true;
      continue;
    }
    if (entry.feels_like.toLowerCase().includes(token)) {
      score += 3;
      rationale.push(`feels_like:${token}`);
      matchedPositive = true;
      continue;
    }
    if (idAndText.includes(token)) {
      score += 1;
      rationale.push(`weak:${token}`);
      matchedPositive = true;
    }
    if (
      !matchedPositive &&
      (entry.not_this_if.some((n) => n.toLowerCase().includes(token)) ||
        entry.does_not_cover.some((d) => d.what.toLowerCase().includes(token)))
    ) {
      score -= 3;
      rationale.push(`penalty:${token}`);
    }
  }
  return { score, rationale };
}
function adjustForHints(
  entry: CatalogEntry,
  hints: IntentHints
): { delta: number; rationale: string[] } {
  let delta = 0;
  const rationale: string[] = [];
  const axisText = entry.axes
    .map((axis) => `${axis.name} ${axis.fields.join(" ")} ${axis.note ?? ""}`)
    .join(" ")
    .toLowerCase();
  if (hints.layout) {
    if (entry.id.startsWith("module.") || entry.id.startsWith("section.")) {
      delta += 3;
      rationale.push("hint:layout-structure");
    }
    if (axisText.includes("layout") || axisText.includes("columns") || axisText.includes("grid")) {
      delta += 4;
      rationale.push("hint:layout-axis");
    }
    if (entry.id.startsWith("element.")) {
      delta -= 1;
      rationale.push("hint:layout-not-single-element");
    }
    if (entry.id.startsWith("background.")) {
      delta -= 2;
      rationale.push("hint:layout-not-background");
    }
    if (entry.kind === "trigger") {
      delta -= 4;
      rationale.push("hint:layout-not-primary-trigger");
    }
  }
  if (hints.interaction) {
    if (entry.kind === "trigger") {
      delta += 3;
      rationale.push("hint:interaction-trigger");
    }
    if (
      axisText.includes("hover") ||
      axisText.includes("click") ||
      axisText.includes("cursor") ||
      axisText.includes("trigger")
    ) {
      delta += 2;
      rationale.push("hint:interaction-axis");
    }
    if (entry.id.startsWith("background.")) {
      delta -= 1;
      rationale.push("hint:interaction-not-background");
    }
  }
  if (hints.background && entry.id.startsWith("background.")) {
    delta += 3;
    rationale.push("hint:background-match");
  }
  return { delta, rationale };
}
function buildSuggestedConfig(entry: CatalogEntry): Record<string, unknown> | undefined {
  const type = schemaTypeHint(entry);
  const firstAxis = entry.axes[0];
  if (!type && !firstAxis) return undefined;
  const config = {
    ...(type ? { type } : {}),
    ...(firstAxis?.fields?.[0] ? { [firstAxis.fields[0]]: "<value>" } : {}),
  };
  return Object.keys(config).length > 0 ? config : undefined;
}

function addAugmenting(
  out: Array<{ cluster_id: string; purpose: string }>,
  index: CatalogIndex,
  cluster_id: string,
  purpose: string
): void {
  if (!index.byId.has(cluster_id)) return;
  if (out.some((row) => row.cluster_id === cluster_id)) return;
  out.push({ cluster_id, purpose });
}

function resolveAugmentingClusters(
  entry: CatalogEntry,
  tokens: string[],
  index: CatalogIndex
): Array<{ cluster_id: string; purpose: string }> {
  const augmenting: Array<{ cluster_id: string; purpose: string }> = [];
  if (hasAnyToken(tokens, ["scroll", "parallax", "progress", "viewport"]))
    addAugmenting(augmenting, index, "trigger.onViewportProgress", "scroll-trigger/progress");
  if (hasAnyToken(tokens, ["hover", "cursor", "pointer"]))
    addAugmenting(augmenting, index, "trigger.cursor", "hover/cursor interaction");
  if (hasAnyToken(tokens, ["click", "tap", "press"]))
    addAugmenting(augmenting, index, "trigger.onClick", "click interaction");
  if (hasAnyToken(tokens, ["timer", "delay", "interval"]))
    addAugmenting(augmenting, index, "trigger.timer", "time-based trigger");
  if (hasAnyToken(tokens, ["keyboard", "key", "shortcut"]))
    addAugmenting(augmenting, index, "trigger.keyboard", "keyboard input trigger");
  if (hasAnyToken(tokens, ["reveal", "fade", "slide", "enter", "exit", "animate", "animation"]))
    addAugmenting(augmenting, index, "motion.fade", "basic entry/exit motion preset");

  for (const parent of entry.composes_with?.parents ?? [])
    addAugmenting(augmenting, index, parent, "typical parent composition");
  for (const sibling of entry.composes_with?.siblings_typical ?? [])
    addAugmenting(augmenting, index, sibling, "typical sibling composition");

  return augmenting.filter((candidate) => candidate.cluster_id !== entry.id);
}

export async function runProbe(args: string[], io: CommandIo): Promise<number> {
  const { asJson, strict, strictKind, help, verbose, requestedKind, top, intent } =
    parseProbeArgs(args);
  if (help) {
    io.printText(
      'Usage: pb-cli probe [--kind <element|trigger|motion|section|background>] [--strict-kind] [--strict] [--top <n>] [--verbose] [--json] "<intent>"'
    );
    return 0;
  }
  if (!isAllowedKind(requestedKind)) {
    const message = `Invalid --kind value: ${requestedKind}. Expected one of element|trigger|motion|section|background.`;
    if (asJson) io.printErrorJson({ command: "probe", status: "error", message });
    else io.printErrorText(message);
    return 2;
  }
  if (!intent) {
    io.printUsage();
    return 2;
  }

  const tokens = tokenize(intent);
  const hints = detectHints(tokens);
  const catalog = loadCatalog();
  const index = buildCatalogIndex(catalog.entries);
  const scored: ProbeRow[] = catalog.entries
    .filter((entry) => matchesKind(entry, requestedKind))
    .map((entry) => {
      const base = scoreEntry(entry, tokens);
      const hintAdjust = adjustForHints(entry, hints);
      const score = base.score + hintAdjust.delta;
      const rationale = [...base.rationale, ...hintAdjust.rationale];
      const augmentingClusters =
        score >= PROBE_MATCH_THRESHOLD ? resolveAugmentingClusters(entry, tokens, index) : [];
      return {
        tier: (score >= PROBE_MATCH_THRESHOLD ? "match" : "near") as "match" | "near",
        cluster_id: entry.id,
        confidence: confidenceFromScore(score),
        score,
        rationale,
        ...(score >= PROBE_MATCH_THRESHOLD
          ? {
              suggested_config: buildSuggestedConfig(entry),
              ...(augmentingClusters.length > 0 ? { augmenting_clusters: augmentingClusters } : {}),
            }
          : { gap: bestGap(entry, tokens) }),
      };
    })
    .sort((a, b) => b.score - a.score)
    .filter((row) => row.score > 0);

  const filtered = strict ? scored.filter((row) => row.confidence !== "low") : scored;
  const hasStrongStructural = filtered.some(
    (row) => row.tier === "match" && isStructuralCluster(row.cluster_id)
  );
  const pruned = hasStrongStructural
    ? filtered.filter((row) => !(row.cluster_id.startsWith("trigger.") && row.tier === "near"))
    : filtered;
  const topRows = pruned.slice(0, Math.max(1, Number.isFinite(top) ? top : 5));
  const strictKindFailed =
    strictKind && !!requestedKind && topRows.every((row) => row.tier !== "match");
  const matches = topRows.filter((row) => row.tier === "match");
  const nearMisses = topRows.filter((row) => row.tier === "near");

  if (asJson) {
    const firstMatchId = matches[0]?.cluster_id ?? "<cluster-id>";
    const jsonBody = {
      command: "probe",
      intent,
      tokens,
      matches: matches.map((row) => ({
        tier: row.tier,
        cluster_id: row.cluster_id,
        confidence: row.confidence,
        ...(row.suggested_config ? { suggested_config: row.suggested_config } : {}),
        ...(row.augmenting_clusters ? { augmenting_clusters: row.augmenting_clusters } : {}),
        ...(verbose ? { score: row.score, rationale: row.rationale } : {}),
      })),
      near_misses: nearMisses.map((row) => ({
        cluster_id: row.cluster_id,
        confidence: row.confidence,
        gap: row.gap ?? "Partial intent overlap",
        ...(verbose ? { score: row.score, rationale: row.rationale } : {}),
      })),
      no_match: matches.length === 0,
      ...(requestedKind ? { requested_kind: requestedKind } : {}),
      ...(strictKind ? { strict_kind: true } : {}),
      suggested_next:
        matches.length === 0
          ? `pb-cli propose new --intent \"${intent}\"`
          : `pb-cli explain ${firstMatchId}`,
    };
    if (strictKindFailed) {
      io.printErrorJson({
        ...jsonBody,
        status: "error",
        diagnostics: [
          {
            severity: "error",
            code: "PB_PROBE_STRICT_KIND_FAILED",
            message: "No direct match found within requested --kind.",
          },
        ],
      });
      return 1;
    }
    io.printJson(jsonBody);
    return 0;
  }

  io.printText(`Probe: "${intent}"`);
  io.printText("");
  io.printText(`MATCHES (${matches.length})`);
  for (const row of matches) {
    io.printText(`  - ${row.cluster_id} [${row.confidence}]`);
    if (row.suggested_config)
      io.printText(`    suggested: ${JSON.stringify(row.suggested_config)}`);
    for (const cluster of row.augmenting_clusters ?? [])
      io.printText(`    compose with: ${cluster.cluster_id} (${cluster.purpose})`);
    if (verbose) {
      io.printText(`    score: ${row.score}`);
      if (row.rationale.length > 0) io.printText(`    rationale: ${row.rationale.join(", ")}`);
    }
  }

  io.printText("");
  io.printText(`NEAR MISSES (${nearMisses.length})`);
  for (const row of nearMisses) {
    io.printText(`  - ${row.cluster_id} [${row.confidence}]`);
    if (row.gap) io.printText(`    gap: ${row.gap}`);
    if (verbose) {
      io.printText(`    score: ${row.score}`);
      if (row.rationale.length > 0) io.printText(`    rationale: ${row.rationale.join(", ")}`);
    }
  }

  io.printText("");
  const headMatch = matches[0];
  io.printText(
    matches.length === 0
      ? `No direct match. Next: pb-cli propose new --intent "${intent}"`
      : `Next: pb-cli explain ${headMatch?.cluster_id ?? "<cluster-id>"}`
  );
  if (strictKindFailed) {
    io.printErrorText("ERROR: strict-kind failed (no direct match within requested kind).");
    return 1;
  }
  return 0;
}

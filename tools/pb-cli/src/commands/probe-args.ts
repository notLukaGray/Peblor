export type ProbeCliOptions = {
  asJson: boolean;
  strict: boolean;
  strictKind: boolean;
  help: boolean;
  verbose: boolean;
  requestedKind?: string;
  top: number;
  intent: string;
};

export function parseProbeArgs(args: string[]): ProbeCliOptions {
  const asJson = args.includes("--json");
  const strict = args.includes("--strict");
  const strictKind = args.includes("--strict-kind");
  const help = args.includes("--help") || args.includes("-h");
  const verbose = args.includes("--verbose");
  const kindIndex = args.indexOf("--kind");
  const topIndex = args.indexOf("--top");
  const requestedKind = kindIndex >= 0 ? args[kindIndex + 1] : undefined;
  const parsedTop = topIndex >= 0 ? Number(args[topIndex + 1]) : 5;
  const top = Number.isFinite(parsedTop) && parsedTop > 0 ? Math.min(20, Math.floor(parsedTop)) : 5;

  const consumed = new Set<number>();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (
      arg === "--json" ||
      arg === "--strict" ||
      arg === "--strict-kind" ||
      arg === "--verbose" ||
      arg === "--help" ||
      arg === "-h"
    )
      consumed.add(i);
    if (arg === "--kind" || arg === "--top") {
      consumed.add(i);
      if (i + 1 < args.length) consumed.add(i + 1);
    }
  }

  return {
    asJson,
    strict,
    strictKind,
    help,
    verbose,
    requestedKind,
    top,
    intent: args
      .filter((_, index) => !consumed.has(index))
      .join(" ")
      .trim(),
  };
}

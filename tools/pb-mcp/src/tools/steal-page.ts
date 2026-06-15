import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const stealPage: Tool = {
  def: {
    name: "steal_page",
    description: [
      "Return a structured workflow step for studying a reference page's design language and ",
      "generating a net-new, ORIGINAL Peblor page inspired by it — NOT a cloning tool. The ",
      "output shares no copy, colors, fonts, or imagery with the source: only abstract patterns ",
      "(type-scale ratios, color relationships, spacing rhythm, layout composition, responsive ",
      "behavior) carry over, then get re-expressed through this project's own presets, tokens, ",
      "and catalog. A built-in originality audit (Pass 5) verifies nothing from the source ",
      "leaked into the output before the page is considered done.",
      "The pipeline has 5 passes — call them in sequence, one per call.",
      "Passes 1-3 MEASURE the reference (scripted extraction — zero AI reasoning: save layout ",
      "rhythm, a DESCRIPTIVE visual inventory — roles and aspect ratios, never downloaded assets ",
      "— and typography/color ratios as structured data).",
      "Pass 4 DESIGNS AND BUILDS the original page (the ONLY pass requiring AI reasoning — studies ",
      "the measured data as a quality bar, writes original copy, and builds with this project's ",
      "own idioms and placeholder visuals).",
      "Pass 5 VERIFIES the result (a mechanical originality audit confirming no leaked copy/",
      "colors/fonts/assets, plus a responsive-behavior check confirming the new page reflows ",
      "soundly — not a pixel comparison against the source).",
      "State files accumulate at content/pages/<route>/stealState/. Each pass reads from prior passes.",
      "Default is pass 4 (generation). Use passes 1-3 first to gather measurements, then pass 4 ",
      "to generate, then pass 5 to verify.",
    ].join(" "),
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "The reference URL to study (must be a publicly accessible page). Its design " +
            "language becomes a quality bar to clear, not a source to copy.",
        },
        route: {
          type: "string",
          description:
            "Destination route for the new, original Peblor page (e.g. '/stolen/acme-landing' " +
            "— 'stolen' here names the workflow's origin, not the page's content). Inferred from URL if omitted.",
        },
        pass: {
          type: "number",
          description:
            "Which pass to run (1-5). 1=layout measurement, 2=visual inventory (descriptive only — " +
            "no asset downloads), 3=typography & color measurement, 4=original-page generation " +
            "(default — the only AI-reasoning pass), 5=originality audit + responsive verification",
          minimum: 1,
          maximum: 5,
          default: 4,
        },
        dryRun: {
          type: "boolean",
          description: "Preview only, do not write to disk (default false)",
        },
      },
      required: ["url"],
    },
  },
  run: async (args) => {
    const { url, route, pass, dryRun } = args as {
      url: string;
      route?: string;
      pass?: number;
      dryRun?: boolean;
    };
    const cliArgs = ["steal", url];
    if (route) cliArgs.push("--route", route);
    if (pass !== undefined) cliArgs.push("--pass", String(pass));
    if (dryRun) cliArgs.push("--dry-run");
    cliArgs.push("--json");
    return runCli(cliArgs);
  },
};

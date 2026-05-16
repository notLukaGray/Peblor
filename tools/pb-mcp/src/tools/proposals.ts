import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const listProposals: Tool = {
  def: {
    name: "list_proposals",
    description: "List all component proposal files with their ID, status, and kind.",
    inputSchema: { type: "object", properties: {} },
  },
  run: async () => runCli(["propose", "list"]),
};

export const checkProposal: Tool = {
  def: {
    name: "check_proposal",
    description:
      "Validate a proposal file for structural correctness and verify its existing_clusters_considered matches current probe results.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to the .proposal.yaml file" },
      },
      required: ["file"],
    },
  },
  run: async (args) => {
    const { file } = args as { file: string };
    return runCli(["propose", "--check", file]);
  },
};

export const checkAllProposals: Tool = {
  def: {
    name: "check_all_proposals",
    description: "Validate every proposal file in the proposals/ directory.",
    inputSchema: { type: "object", properties: {} },
  },
  run: async () => runCli(["propose", "--check-all"]),
};

export const runConformanceTool: Tool = {
  def: {
    name: "run_conformance",
    description:
      "Run the conformance fixture suite against the pipeline. Returns per-fixture diagnostics — use to verify generated pages satisfy schema and assertion contracts.",
    inputSchema: {
      type: "object",
      properties: {
        fixturesDir: {
          type: "string",
          description:
            "Absolute path to a fixtures directory (defaults to project conformance fixtures)",
        },
      },
    },
  },
  run: async (args) => {
    const { fixturesDir } = args as { fixturesDir?: string };
    return runCli(fixturesDir ? ["conformance", fixturesDir] : ["conformance"]);
  },
};

import type { Tool } from "../types.js";

type Diagnostic = { path?: string; message?: string; code?: string };

function suggestOne(d: Diagnostic): string {
  const path = d.path ?? "$";
  const message = (d.message ?? "").toLowerCase();
  if (path.includes("action") && message.includes("payload")) {
    return "Wrap action fields inside payload: { type, payload: { ... } }";
  }
  if (path.includes("bgKey")) {
    return "Remove bgKey from section/fragment files; bgKey belongs in page index.json only.";
  }
  if (message.includes("invalid discriminator value") || message.includes("expected 'element")) {
    return "Check the `type` literal exactly matches schema values (case-sensitive).";
  }
  if (message.includes("expected array") && path.includes("elements")) {
    return "Provide `elements: []` (or valid element array) at this path.";
  }
  if (message.includes("required")) {
    return "Add the missing required field shown in the diagnostic path.";
  }
  return "Inspect this path in schema docs and align field shape/type with expected contract.";
}

export const suggestFix: Tool = {
  def: {
    name: "suggest_fix",
    description:
      "Given diagnostics, suggest concrete next edits to fix common schema errors quickly.",
    inputSchema: {
      type: "object",
      properties: {
        diagnostics: {
          type: "array",
          items: { type: "object" },
          description: "Diagnostic array with path/message/code fields",
        },
      },
      required: ["diagnostics"],
    },
  },
  run: async (args) => {
    const { diagnostics } = args as { diagnostics: Diagnostic[] };
    return diagnostics.map((d) => ({ path: d.path ?? "$", suggestion: suggestOne(d) }));
  },
};

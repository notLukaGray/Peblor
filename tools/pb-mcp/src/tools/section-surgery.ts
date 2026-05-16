import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const listSections: Tool = {
  def: {
    name: "list_sections",
    description: "List the sections of a page in render order with their keys and types.",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "Route path (e.g. '/about') or absolute file path" },
      },
      required: ["route"],
    },
  },
  run: async (args) => {
    const { route } = args as { route: string };
    return runCli(["section", "list", route, "--json"]);
  },
};

export const addSection: Tool = {
  def: {
    name: "add_section",
    description:
      "Add a new section to a page. Inserts into sectionOrder and writes the definition. Validates before writing. Returns diagnostics if invalid — nothing is written unless write: true and valid.",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "Route path or absolute file path" },
        key: { type: "string", description: "Unique key for the new section" },
        definition: {
          type: "object",
          description: "Section definition block (must include a valid 'type' field)",
        },
        after: { type: "string", description: "Insert after this existing section key" },
        before: { type: "string", description: "Insert before this existing section key" },
        write: { type: "boolean", description: "Write to disk (default false)" },
      },
      required: ["route", "key", "definition"],
    },
  },
  run: async (args) => {
    const { route, key, definition, after, before, write } = args as {
      route: string;
      key: string;
      definition: Record<string, unknown>;
      after?: string;
      before?: string;
      write?: boolean;
    };
    const extra: string[] = ["--key", key, "--definition", JSON.stringify(definition)];
    if (after) extra.push("--after", after);
    if (before) extra.push("--before", before);
    if (write) extra.push("--write");
    return runCli(["section", "add", route, ...extra, "--json"]);
  },
};

export const removeSection: Tool = {
  def: {
    name: "remove_section",
    description:
      "Remove a section from a page by key. Removes from sectionOrder and deletes its definition. Validates the result before writing.",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "Route path or absolute file path" },
        key: { type: "string", description: "Section key to remove" },
        write: { type: "boolean", description: "Write to disk (default false)" },
      },
      required: ["route", "key"],
    },
  },
  run: async (args) => {
    const { route, key, write } = args as { route: string; key: string; write?: boolean };
    const extra = write ? ["--write"] : [];
    return runCli(["section", "remove", route, "--key", key, ...extra, "--json"]);
  },
};

export const moveSection: Tool = {
  def: {
    name: "move_section",
    description:
      "Reorder a section within a page by moving it to a specific index in sectionOrder.",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "Route path or absolute file path" },
        key: { type: "string", description: "Section key to move" },
        to: { type: "number", description: "Target index in sectionOrder (0-based)" },
        write: { type: "boolean", description: "Write to disk (default false)" },
      },
      required: ["route", "key", "to"],
    },
  },
  run: async (args) => {
    const { route, key, to, write } = args as {
      route: string;
      key: string;
      to: number;
      write?: boolean;
    };
    const extra = write ? ["--write"] : [];
    return runCli(["section", "move", route, "--key", key, "--to", String(to), ...extra, "--json"]);
  },
};

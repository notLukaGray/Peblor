#!/usr/bin/env npx tsx
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { allTools } from "./tools/index.js";
import { allResources } from "./resources/index.js";
import type { StaticResource, TemplateResource } from "./types.js";

const server = new Server(
  { name: "peblor", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {} } }
);

const staticResources = allResources.filter((r): r is StaticResource => r.kind === "static");
const templateResources = allResources.filter((r): r is TemplateResource => r.kind === "template");

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools.map((t) => t.def),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = allTools.find((t) => t.def.name === name);
  if (!tool) {
    return {
      content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }
  try {
    const result = await tool.run(args as Record<string, unknown>);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text" as const, text: `Error: ${message}` }],
      isError: true,
    };
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: staticResources.map((r) => ({
    uri: r.uri,
    name: r.name,
    description: r.description,
    mimeType: r.mimeType,
  })),
}));

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
  resourceTemplates: templateResources.map((r) => ({
    uriTemplate: r.uriTemplate,
    name: r.name,
    description: r.description,
    mimeType: r.mimeType,
  })),
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  const staticMatch = staticResources.find((r) => r.uri === uri);
  if (staticMatch) {
    const text = JSON.stringify(await staticMatch.read(), null, 2);
    return { contents: [{ uri, mimeType: staticMatch.mimeType, text }] };
  }

  for (const tmpl of templateResources) {
    const m = tmpl.match(uri);
    if (m) {
      const text = JSON.stringify(await tmpl.read(uri, m), null, 2);
      return { contents: [{ uri, mimeType: tmpl.mimeType, text }] };
    }
  }

  throw new Error(`Unknown resource: ${uri}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);

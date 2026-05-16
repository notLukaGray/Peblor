export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface Tool {
  def: ToolDef;
  run: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface StaticResource {
  kind: "static";
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  read: () => Promise<unknown>;
}

export interface TemplateResource {
  kind: "template";
  uriTemplate: string;
  name: string;
  description: string;
  mimeType: string;
  match: (uri: string) => RegExpMatchArray | null;
  read: (uri: string, m: RegExpMatchArray) => Promise<unknown>;
}

export type Resource = StaticResource | TemplateResource;

import fs from "node:fs";
import path from "node:path";
import { findPagesDir, walkAllPages } from "../lib/pages.js";
import type { CommandIo } from "./types.js";

type SitemapArgs = {
  out?: string;
  format: "xml" | "json";
  asJson: boolean;
  help: boolean;
};

function parseArgs(args: string[]): SitemapArgs {
  const asJson = args.includes("--json");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();

  function flag(name: string): string | undefined {
    const i = args.indexOf(name);
    if (i < 0) return undefined;
    consumed.add(i);
    consumed.add(i + 1);
    return args[i + 1];
  }

  const out = flag("--out");
  const formatStr = flag("--format");
  const format: "xml" | "json" = formatStr === "json" ? "json" : "xml";
  for (let i = 0; i < args.length; i++) {
    if (["--json", "--help", "-h"].includes(args[i]!)) consumed.add(i);
  }

  return { out, format, asJson, help };
}

function buildXml(urls: Array<{ loc: string; changefreq: string }>): string {
  const entries = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

export async function runSitemap(args: string[], io: CommandIo): Promise<number> {
  const { out, format, asJson, help } = parseArgs(args);

  if (help) {
    io.printText("Usage: pb-cli sitemap [--out sitemap.xml] [--format xml|json] [--json]");
    io.printText("\nGenerates a sitemap of all public, non-protected pages.");
    return 0;
  }

  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages not found. Run from the project root.";
    if (asJson) io.printErrorJson({ command: "sitemap", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const pages = walkAllPages(pagesDir);

  // Filter: public pages only (visibility !== "protected" && visibility !== "unlisted")
  const publicPages = pages.filter(({ data }) => {
    const visibility = data.visibility;
    return visibility !== "protected" && visibility !== "unlisted";
  });

  const urls = publicPages.map(({ route, data }) => {
    const canonical = typeof data.canonicalUrl === "string" ? data.canonicalUrl : route;
    return { loc: canonical, changefreq: "weekly" };
  });

  if (format === "json") {
    const result = { command: "sitemap", count: urls.length, urls };
    if (asJson) io.printJson(result);
    else io.printText(JSON.stringify(result, null, 2));
    if (out) {
      const outPath = path.isAbsolute(out) ? out : path.join(process.cwd(), out);
      fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
      io.printText(`Sitemap written: ${outPath}`);
    }
  } else {
    const xml = buildXml(urls);
    if (out) {
      const outPath = path.isAbsolute(out) ? out : path.join(process.cwd(), out);
      fs.writeFileSync(outPath, xml, "utf8");
      if (asJson)
        io.printJson({ command: "sitemap", status: "ok", file: outPath, count: urls.length });
      else io.printText(`Sitemap written: ${outPath} (${urls.length} URLs)`);
    } else {
      if (asJson) {
        io.printJson({ command: "sitemap", count: urls.length, urls });
      } else {
        io.printText(xml);
      }
    }
  }

  return 0;
}

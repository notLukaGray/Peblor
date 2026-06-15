import { readFileSync } from "fs";
import { join } from "path";
import type { Tool } from "../types.js";

type LayoutSection = { key: string; type: string; elements: string[] };
type LayoutTemplate = {
  name: string;
  description: string;
  tags: string[];
  sections: LayoutSection[];
};
type LayoutCatalog = { templates: LayoutTemplate[] };

const SECTION_TYPES = [
  "contentBlock",
  "sectionColumn",
  "scrollContainer",
  "revealSection",
  "divider",
  "formBlock",
  "pageTrigger",
  "sectionTrigger",
];

function findProjectRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    try {
      if (
        readFileSync(join(dir, "package.json"), "utf8").includes('"nlg-site"') ||
        readFileSync(join(dir, "package.json"), "utf8").includes('"peblor"')
      ) {
        return dir;
      }
    } catch (err) {
      console.warn("[pb-mcp] Failed to read package.json while finding project root", dir, err);
    }
    dir = join(dir, "..");
  }
  return process.cwd();
}

function loadTemplates(): LayoutTemplate[] {
  try {
    const root = findProjectRoot();
    const raw = readFileSync(join(root, "content/config/layout-templates.json"), "utf8");
    return (JSON.parse(raw) as LayoutCatalog).templates;
  } catch (err) {
    console.warn("[pb-mcp] Failed to load layout templates, using fallback", err);
    return FALLBACK_TEMPLATES;
  }
}

const FALLBACK_TEMPLATES: LayoutTemplate[] = [
  {
    name: "hero-cta",
    description: "Heading + body + call-to-action button — standard marketing page.",
    tags: ["landing", "marketing", "cta"],
    sections: [
      {
        key: "hero",
        type: "contentBlock",
        elements: ["elementHeading", "elementBody", "elementButton"],
      },
    ],
  },
  {
    name: "hero-features",
    description: "Hero section followed by a column grid of feature items.",
    tags: ["landing", "features", "grid"],
    sections: [
      { key: "hero", type: "contentBlock", elements: ["elementHeading", "elementBody"] },
      { key: "features", type: "sectionColumn", elements: ["elementHeading", "elementBody"] },
    ],
  },
  {
    name: "gallery",
    description: "Grid of images or media items — good for portfolio/work pages.",
    tags: ["portfolio", "gallery", "images"],
    sections: [
      { key: "header", type: "contentBlock", elements: ["elementHeading"] },
      { key: "gallery", type: "sectionColumn", elements: ["elementImage"] },
    ],
  },
  {
    name: "long-form",
    description: "Multi-section article or case study with hero, body, and CTA.",
    tags: ["editorial", "article", "case study"],
    sections: [
      { key: "hero", type: "contentBlock", elements: ["elementHeading", "elementBody"] },
      { key: "body", type: "contentBlock", elements: ["elementBody"] },
      { key: "cta", type: "contentBlock", elements: ["elementButton"] },
    ],
  },
  {
    name: "contact-form",
    description: "Contact or sign-up page with form.",
    tags: ["contact", "form"],
    sections: [
      { key: "hero", type: "contentBlock", elements: ["elementHeading", "elementBody"] },
      { key: "form", type: "formBlock", elements: [] },
    ],
  },
];

function scoreTemplate(tmpl: LayoutTemplate, intentLower: string): number {
  let score = 0;
  const descLower = tmpl.description.toLowerCase();
  const nameLower = tmpl.name.toLowerCase();

  // Tokenize intent
  const intentWords = intentLower.split(/\s+/).filter((w) => w.length > 2);

  // Score against description and name
  for (const word of intentWords) {
    if (descLower.includes(word) || nameLower.includes(word)) score += 2;
  }

  // Score against tags (higher weight — tags are curated)
  for (const tag of tmpl.tags) {
    const tagLower = tag.toLowerCase();
    if (intentLower.includes(tagLower)) score += 5;
    // Partial token match
    for (const word of intentWords) {
      if (tagLower.includes(word) || word.includes(tagLower.split(" ")[0]!)) score += 2;
    }
  }

  // Intent keyword → category boosts
  if (intentLower.includes("video") && (nameLower.includes("video") || tmpl.tags.includes("video")))
    score += 8;
  if (
    intentLower.includes("gallery") &&
    tmpl.tags.some((t) => ["gallery", "portfolio", "images"].includes(t))
  )
    score += 8;
  if (
    (intentLower.includes("contact") || intentLower.includes("form")) &&
    tmpl.tags.includes("form")
  )
    score += 8;
  if (
    intentLower.includes("portfolio") &&
    tmpl.tags.some((t) => ["portfolio", "gallery"].includes(t))
  )
    score += 8;
  if (
    intentLower.includes("landing") &&
    tmpl.tags.some((t) => ["landing", "marketing"].includes(t))
  )
    score += 6;
  if (
    intentLower.includes("about") &&
    tmpl.tags.some((t) => ["about", "team", "company"].includes(t))
  )
    score += 8;
  if (
    intentLower.includes("blog") &&
    tmpl.tags.some((t) => ["editorial", "blog", "article"].includes(t))
  )
    score += 8;
  if (intentLower.includes("pricing") && tmpl.tags.includes("pricing")) score += 10;
  if (intentLower.includes("faq") && tmpl.tags.includes("faq")) score += 10;
  if (
    (intentLower.includes("team") || intentLower.includes("people")) &&
    tmpl.tags.some((t) => ["team", "people", "profiles"].includes(t))
  )
    score += 8;
  if (
    (intentLower.includes("testimonial") || intentLower.includes("review")) &&
    tmpl.tags.some((t) => ["testimonials", "reviews", "social proof"].includes(t))
  )
    score += 8;
  if (
    (intentLower.includes("stat") ||
      intentLower.includes("metric") ||
      intentLower.includes("number")) &&
    tmpl.tags.some((t) => ["stats", "metrics", "numbers"].includes(t))
  )
    score += 8;
  if (
    (intentLower.includes("event") || intentLower.includes("conference")) &&
    tmpl.tags.some((t) => ["event", "conference"].includes(t))
  )
    score += 10;
  if (
    (intentLower.includes("waitlist") ||
      intentLower.includes("signup") ||
      intentLower.includes("early access")) &&
    tmpl.tags.some((t) => ["waitlist", "signup", "early access"].includes(t))
  )
    score += 10;
  if (
    (intentLower.includes("3d") ||
      intentLower.includes("model") ||
      intentLower.includes("three")) &&
    tmpl.tags.some((t) => ["3d", "model", "three"].includes(t))
  )
    score += 10;
  if (
    (intentLower.includes("rive") ||
      intentLower.includes("lottie") ||
      intentLower.includes("animation")) &&
    tmpl.tags.some((t) => ["rive", "animation", "lottie"].includes(t))
  )
    score += 10;
  if (
    (intentLower.includes("audio") ||
      intentLower.includes("music") ||
      intentLower.includes("podcast")) &&
    tmpl.tags.some((t) => ["audio", "music", "podcast"].includes(t))
  )
    score += 10;
  if (
    (intentLower.includes("saas") ||
      intentLower.includes("software") ||
      intentLower.includes("product")) &&
    tmpl.tags.some((t) => ["saas", "product", "software"].includes(t))
  )
    score += 5;
  if (
    (intentLower.includes("changelog") || intentLower.includes("release")) &&
    tmpl.tags.some((t) => ["changelog", "release"].includes(t))
  )
    score += 10;
  if (
    (intentLower.includes("career") ||
      intentLower.includes("job") ||
      intentLower.includes("hiring")) &&
    tmpl.tags.some((t) => ["jobs", "careers", "hiring"].includes(t))
  )
    score += 10;
  if (
    (intentLower.includes("bento") || intentLower.includes("mosaic")) &&
    tmpl.tags.some((t) => ["bento", "mosaic"].includes(t))
  )
    score += 10;

  return score;
}

export const suggestLayout: Tool = {
  def: {
    name: "suggest_layout",
    description:
      "Given a page intent, suggest ranked layout templates with section structures. Returns the top 5 most relevant templates from a catalog of 50+ options covering landing pages, portfolios, editorial, product, contact, video, events, and more.",
    inputSchema: {
      type: "object",
      properties: {
        intent: {
          type: "string",
          description: "Natural-language description of the page purpose",
        },
        sectionCount: {
          type: "number",
          description: "Filter to templates with exactly this many sections (optional)",
        },
        kind: {
          type: "string",
          description: "Filter by category keyword (optional)",
        },
      },
      required: ["intent"],
    },
  },
  run: async (args) => {
    const { intent, sectionCount, kind } = args as {
      intent: string;
      sectionCount?: number;
      kind?: string;
    };

    const templates = loadTemplates();
    const intentLower = intent.toLowerCase();
    const kindLower = kind?.toLowerCase();

    const scored = templates
      .map((tmpl) => ({ ...tmpl, score: scoreTemplate(tmpl, intentLower) }))
      .filter((t) => !sectionCount || t.sections.length === sectionCount)
      .filter(
        (t) =>
          !kindLower || t.tags.some((tag) => tag.includes(kindLower)) || t.name.includes(kindLower)
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ score: _score, ...tmpl }) => tmpl);

    return {
      intent,
      totalTemplates: templates.length,
      suggestions: scored,
      availableSectionTypes: SECTION_TYPES,
      note: "Each suggestion is a starting template — adjust section count, types, and presets as needed for the specific intent.",
    };
  },
};

import fs from "fs";
import path from "path";
import { findPagesDir, findPageFile, routeToWritePath } from "../lib/pages.js";
import type { CommandIo } from "./types.js";

type GeneratePageArgs = {
  route?: string;
  intent?: string;
  dryRun: boolean;
  asJson: boolean;
  help: boolean;
};

function parseGeneratePageArgs(args: string[]): GeneratePageArgs {
  const asJson = args.includes("--json");
  const dryRun = args.includes("--dry-run");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();

  function flag(name: string): string | undefined {
    const i = args.indexOf(name);
    if (i < 0) return undefined;
    consumed.add(i);
    consumed.add(i + 1);
    return args[i + 1];
  }

  const intent = flag("--intent");
  for (let i = 0; i < args.length; i++) {
    if (["--json", "--dry-run", "--help", "-h"].includes(args[i]!)) consumed.add(i);
  }

  const positional = args.filter((_, i) => !consumed.has(i));
  return { route: positional[0], intent, dryRun, asJson, help };
}

function toTitleFromRoute(route: string): string {
  const segment = route.split("/").filter(Boolean).at(-1)?.replace(/[-_]+/g, " ").trim();
  if (!segment) return "Untitled";
  return segment
    .split(" ")
    .filter(Boolean)
    .map((p) => `${p.charAt(0).toUpperCase()}${p.slice(1)}`)
    .join(" ");
}

function findCatalogsDir(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, ".claude/skills/peblor-page-generator/references");
    if (fs.existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  return null;
}

function readCatalog(catalogsDir: string, name: string): string {
  try {
    return fs.readFileSync(path.join(catalogsDir, name), "utf8");
  } catch (err) {
    console.warn("[pb-cli] Failed to read catalog file", name, err);
    return "";
  }
}

// Detect page type from intent keywords for targeted section planning
function detectPageType(intent: string): string {
  const lower = intent.toLowerCase();
  if (/portfolio|gallery|work|project|showcase/.test(lower)) return "portfolio";
  if (/blog|article|editorial|case study|story/.test(lower)) return "editorial";
  if (/video|film|media|player/.test(lower)) return "video";
  if (/contact|form|inquiry|get in touch/.test(lower)) return "contact";
  if (/product|saas|pricing|features|how it works/.test(lower)) return "product";
  if (/about|team|company|who we are/.test(lower)) return "about";
  return "landing"; // default
}

// Pick the most relevant bg presets by intent keywords
function suggestBgPresets(intent: string): string[] {
  const lower = intent.toLowerCase();
  const all: Record<string, string[]> = {
    dark: ["bg-dark-moody", "bg-landing-deep", "bg-aurora"],
    light: ["bg-light-airy", "bg-type", "bg-solid"],
    video: ["bg-video-dark", "bg-video-gradient", "bg-video-light"],
    gradient: ["bg-aurora", "bg-vibrant", "bg-composition"],
    pattern: ["bg-pattern-dots", "bg-pattern-grid", "bg-pattern-noise"],
    spotlight: ["bg-spotlight", "bg-composition"],
    project: ["bg-project-cool", "bg-project-warm", "bg-project-icy"],
  };
  const suggestions = new Set<string>();
  for (const [keyword, presets] of Object.entries(all)) {
    if (lower.includes(keyword)) presets.forEach((p) => suggestions.add(p));
  }
  if (suggestions.size === 0) {
    ["bg-aurora", "bg-landing-deep", "bg-composition"].forEach((p) => suggestions.add(p));
  }
  return [...suggestions].slice(0, 4);
}

// Pick most relevant card presets by intent
function suggestCardPresets(intent: string): string[] {
  const lower = intent.toLowerCase();
  if (/stat|number|metric|kpi/.test(lower)) return ["card-stat-single", "card-stat-row"];
  if (/testimonial|review|quote|proof/.test(lower))
    return ["card-testimonial-person", "card-proof-block"];
  if (/article|blog|post|editorial/.test(lower))
    return ["card-article-preview", "card-row-editorial"];
  if (/feature|benefit|why|value/.test(lower)) return ["card-feature-basic", "card-copy-stack"];
  if (/profile|team|person|people/.test(lower))
    return ["card-profile-mini", "card-testimonial-person"];
  if (/image|photo|media|gallery/.test(lower))
    return ["card-image-feature", "card-media-caption", "card-grid-basic"];
  if (/video|player|film/.test(lower)) return ["card-media-caption", "card-preview-panel"];
  return ["card-feature-basic", "card-copy-stack", "card-image-feature"];
}

// Pick section structure template by page type
function getSectionPlan(pageType: string, route: string): string {
  const templates: Record<string, string> = {
    landing: `Section plan for ${route} (landing page):
  hero: contentBlock — full-viewport, bg-aurora or bg-vibrant, h1 + lead body + 2 buttons (primary + ghost)
  value-props: sectionColumn — columns [1,3], 3× card-feature-basic, bg-light-airy or bg-solid
  social-proof: sectionColumn — columns [1,2], 2× card-testimonial-person
  final-cta: contentBlock — bg-landing-deep, h2 + body + primary button`,

    portfolio: `Section plan for ${route} (portfolio page):
  header: contentBlock — minimal height, bg-type or no bg, page title + subtitle
  gallery: sectionColumn — columns [1,2], 4-8× card-image-feature or card-grid-basic
  contact-cta: contentBlock — bg-dark-moody, heading + button`,

    editorial: `Section plan for ${route} (editorial/article page):
  hero: contentBlock — full-height, bg-image-darken, article title + byline
  body-intro: contentBlock — max-width prose, lead body text
  body-content: contentBlock — text sections with supporting images
  conclusion: contentBlock — summary + next-article links`,

    video: `Section plan for ${route} (video page):
  hero-video: contentBlock — elementVideo with module player, full-height
  playlist: sectionColumn — columns [1,4], 4× card-media-caption or card-preview-panel
  description: contentBlock — title + body + related links`,

    contact: `Section plan for ${route} (contact page):
  hero: contentBlock — medium height, bg-composition, page title
  contact-form: formBlock — name + email + message fields, action: "contact"`,

    product: `Section plan for ${route} (product page):
  hero: contentBlock — bg-vibrant or bg-aurora, product title + tagline + demo CTA
  features: sectionColumn — columns [1,3], 6× card-feature-basic or card-stat-single
  how-it-works: contentBlock — numbered steps
  cta: contentBlock — bg-landing-deep, strong CTA`,

    about: `Section plan for ${route} (about page):
  hero: contentBlock — bg-composition, company story headline
  content: contentBlock — alternating text + image
  team: sectionColumn — columns [1,3], card-profile-mini
  cta: contentBlock — heading + contact button`,
  };
  return templates[pageType] ?? templates.landing!;
}

function buildRichPrompt(args: {
  route: string;
  intent: string;
  catalogsDir: string | null;
}): string {
  const { route, intent, catalogsDir } = args;
  const pageType = detectPageType(intent);
  const bgPresets = suggestBgPresets(intent);
  const cardPresets = suggestCardPresets(intent);
  const sectionPlan = getSectionPlan(pageType, route);
  const derivedTitle = toTitleFromRoute(route);

  // Read key catalog excerpts
  const sectionCatalog = catalogsDir ? readCatalog(catalogsDir, "section-catalog.md") : "";
  const presetCatalog = catalogsDir ? readCatalog(catalogsDir, "preset-catalog.md") : "";
  const motionCatalog = catalogsDir ? readCatalog(catalogsDir, "motion-catalog.md") : "";
  const compositionRules = catalogsDir ? readCatalog(catalogsDir, "composition-rules.md") : "";

  // Trim to a reasonable length to avoid overwhelming the context
  const sectionExcerpt = sectionCatalog.slice(0, 3000);
  const presetExcerpt = presetCatalog.slice(0, 2000);
  const motionExcerpt = motionCatalog.slice(0, 1500);
  const rulesExcerpt = compositionRules.slice(0, 2000);

  return `You are generating a Peblor page JSON for route "${route}".

Intent: "${intent}"
Detected page type: ${pageType}

---

## Step 1: Section plan

Before writing any JSON, reason about the sections this page needs. Here is the recommended plan for a ${pageType} page:

${sectionPlan}

Adjust this plan based on the specific intent. Add or remove sections as needed. Never generate a page with only one section.

---

## Step 2: Preset selection

**Recommended background presets** for this intent:
${bgPresets.map((p) => `- \`${p}\``).join("\n")}

**Recommended card presets** for this intent:
${cardPresets.map((p) => `- \`${p}\``).join("\n")}

**Button presets:** btn-primary, btn-secondary, btn-ghost, btn-glass, btn-quiet

---

## Step 3: Generation rules

Apply ALL of these rules — they are not optional:

1. **Every section gets a background.** Use background preset or inline bg type. Don't leave sections without backgrounds.
2. **Use presets.** Start every card, button, and element from a preset where one exists. Override only what's specific.
3. **Responsive always.** "columns": [1, 3] not 3. "padding": ["3rem 1.5rem", "5rem 4rem"] not "5rem 4rem".
4. **Motion always.** Every heading gets motionTiming with entrancePreset and trigger. Card grids get stagger.
5. **Theme tokens only.** Use var(--pb-primary), var(--pb-on-secondary), color-mix(). Never hardcoded hex.
6. **Real content.** Fill every text field with realistic content matching the intent.
7. **Diverse sections.** Use a mix of contentBlock + sectionColumn. At minimum: hero (contentBlock) + content (sectionColumn).

---

## Quick reference patterns

Heading with entrance motion:
  { "type": "elementHeading", "level": 1, "variant": "display", "text": "Headline",
    "color": "var(--pb-on-secondary)",
    "motionTiming": { "entrancePreset": "blurIn", "trigger": "onFirstVisible" } }

Button from preset:
  { "preset": "btn-primary", "label": "Get started", "href": "/contact" }

Card grid (3 cols desktop, 1 mobile):
  { "type": "sectionColumn", "columns": [1, 3], "padding": ["3rem 1.5rem", "5rem 4rem"],
    "elementOrder": ["card-a", "card-b", "card-c"],
    "definitions": {
      "card-a": { "preset": "card-feature-basic", "definitions": {
        "heading": { "type": "elementHeading", "level": 3, "text": "Feature name" },
        "body": { "type": "elementBody", "text": "Description" }
      }}
    }}

Aurora background:
  { "background": { "preset": "bg-aurora" } }

Stagger entrance:
  "motionTiming": { "entrancePreset": "slideUp", "trigger": "onFirstVisible",
                    "staggerChildren": 0.08, "delayChildren": 0.1 }

---

## Section type reference

${sectionExcerpt || `Section types: contentBlock, sectionColumn, scrollContainer, formBlock, revealSection, divider`}

---

## Preset reference

${presetExcerpt || `See content/presets/ for available preset keys`}

---

## Motion reference

${motionExcerpt}

---

## Composition rules

${rulesExcerpt}

---

## Output

Generate a complete, valid Peblor page JSON for route "${route}" with title "${derivedTitle}".

The JSON must:
- Use the section plan above (adjusted to the intent)
- Follow all generation rules in Step 3
- Pass Peblor schema validation
- Have all text fields filled with real content

Return ONLY the page JSON object, no commentary.`;
}

export async function runGeneratePage(args: string[], io: CommandIo): Promise<number> {
  const { route, intent, dryRun, asJson, help } = parseGeneratePageArgs(args);

  if (help) {
    io.printText('Usage: pb-cli generate <route> --intent "..." [--dry-run] [--json]');
    io.printText("");
    io.printText(
      "Returns a scaffold + schema context + a structured prompt for an AI agent to fill in."
    );
    io.printText("Pass --dry-run to preview without writing (default).");
    return 0;
  }

  if (!route) {
    io.printErrorText("Error: route is required.");
    io.printText('Usage: pb-cli generate <route> --intent "..." [--dry-run] [--json]');
    return 2;
  }

  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages not found. Run from the project root.";
    if (asJson) io.printErrorJson({ command: "generate", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const existingFile = findPageFile(pagesDir, route);
  if (existingFile && !dryRun) {
    const msg = `Page already exists at ${existingFile}. Use --dry-run to preview or clone to duplicate.`;
    if (asJson) io.printErrorJson({ command: "generate", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 1;
  }

  const derivedTitle = toTitleFromRoute(route);
  const catalogsDir = findCatalogsDir();

  const scaffold = {
    title: derivedTitle,
    description: "",
    sectionOrder: ["hero"],
    definitions: {
      hero: {
        type: "contentBlock",
        background: { preset: "bg-aurora" },
        padding: ["4rem 1.5rem", "8rem 4rem"],
        elements: [
          {
            type: "elementHeading",
            level: 1,
            variant: "display",
            text: "",
            color: "var(--pb-on-secondary)",
            motionTiming: { entrancePreset: "blurIn", trigger: "onFirstVisible" },
          },
          { type: "elementBody", variant: "lead", text: "", color: "var(--pb-on-secondary)" },
        ],
      },
    },
  };

  const prompt = intent
    ? buildRichPrompt({ route, intent, catalogsDir })
    : `Fill in the page scaffold for route "${route}". Use Peblor section types (contentBlock, sectionColumn, formBlock) and preset references for buttons/cards/backgrounds.`;

  const destFile = dryRun ? "(dry-run — not written)" : routeToWritePath(pagesDir, route);

  const result = {
    command: "generate",
    route,
    ...(intent ? { intent } : {}),
    dryRun,
    destFile,
    scaffold,
    ...(catalogsDir ? { catalogsDir } : {}),
    prompt,
  };

  if (asJson) {
    io.printJson(result);
  } else {
    io.printText(`Generate page: ${route}`);
    if (intent) io.printText(`  Intent: ${intent}`);
    io.printText(`  Scaffold: ${destFile}`);
    if (catalogsDir) io.printText(`  Catalogs: ${catalogsDir}`);
    io.printText("");
    io.printText("Prompt for AI agent:");
    io.printText(prompt);
  }

  return 0;
}

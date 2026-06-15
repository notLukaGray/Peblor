import fs from "fs";
import path from "path";
import { triggerActionSchema } from "@pb/contracts";
import type { z } from "zod";

type AnySchema = z.ZodTypeAny & {
  def?: { type?: string; shape?: Record<string, AnySchema>; values?: unknown[] | Set<unknown> };
  options?: AnySchema[];
  shape?: Record<string, AnySchema>;
  unwrap?: () => AnySchema;
};

type ActionTypeSummary = { type: string; payload: Array<{ key: string; type: string }> };

function unwrapSchema(schema: AnySchema): AnySchema {
  let current = schema;
  while (current.def?.type === "optional" && current.unwrap) current = current.unwrap();
  return current;
}

function describeSchema(schema: AnySchema): string {
  const s = unwrapSchema(schema);
  const t = s.def?.type ?? "unknown";
  if (t === "string" || t === "number" || t === "boolean") return t;
  if (t === "literal") {
    const values = s.def?.values;
    const literal =
      values instanceof Set ? [...values][0] : Array.isArray(values) ? values[0] : undefined;
    return `literal(${String(literal)})`;
  }
  if (t === "enum") {
    const values = (s as { options?: string[] }).options ?? [];
    return `enum(${values.join("|")})`;
  }
  if (t === "array") return "array";
  if (t === "object") return "object";
  if (t === "union") return "union";
  return t;
}

function getTypeValue(option: AnySchema): string | null {
  const shape = option.shape ?? option.def?.shape ?? {};
  const typeNode = shape.type;
  const values = typeNode?.def?.values;
  if (values instanceof Set) return String([...values][0]);
  if (Array.isArray(values) && values.length > 0) return String(values[0]);
  return null;
}

function getPayloadShape(option: AnySchema): Array<{ key: string; type: string }> {
  const shape = option.shape ?? option.def?.shape ?? {};
  const payloadNode = shape.payload;
  if (!payloadNode) return [];
  const payload = unwrapSchema(payloadNode);
  const payloadObjShape = payload.shape ?? payload.def?.shape;
  if (!payloadObjShape) return [{ key: "payload", type: describeSchema(payload) }];
  return Object.entries(payloadObjShape).map(([key, value]) => ({
    key,
    type: describeSchema(value),
  }));
}

function listActionTypeSummaries(): ActionTypeSummary[] {
  const options = ((triggerActionSchema as AnySchema).options ??
    (triggerActionSchema as unknown as { _def?: { options?: AnySchema[] } })._def?.options ??
    []) as AnySchema[];
  return options
    .map((option) => {
      const type = getTypeValue(option);
      return type ? { type, payload: getPayloadShape(option) } : null;
    })
    .filter((row): row is ActionTypeSummary => row != null)
    .sort((a, b) => a.type.localeCompare(b.type));
}

type CommandIo = { printText: (s: string) => void; printErrorText: (s: string) => void };

function findProjectRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, "package.json")) && fs.existsSync(path.join(dir, "content"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  throw new Error("Could not find project root");
}

function readJson(filePath: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    console.warn("[pb-cli] Failed to read JSON file for catalog generation", filePath, err);
    return null;
  }
}

function findFiles(dir: string, ext = ".json"): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(ext)) results.push(full);
    }
  }
  walk(dir);
  return results;
}

function trimmedJson(obj: unknown, maxLen = 300): string {
  const s = JSON.stringify(obj, null, 2);
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen) + "\n  ... (truncated)";
}

// ── Element catalog ──────────────────────────────────────────────────────────

const ELEMENT_CATALOG: Array<{
  type: string;
  description: string;
  keyFields: string[];
  example: object;
}> = [
  {
    type: "elementHeading",
    description:
      "Heading text — h1–h6. Use variants: display (hero), section (sub), label (eyebrow).",
    keyFields: [
      "type",
      "text",
      "level (1–6)",
      "variant (display|section|label)",
      "color",
      "motionTiming",
    ],
    example: {
      type: "elementHeading",
      level: 1,
      variant: "display",
      text: "Your headline here",
      motionTiming: { entrancePreset: "blurIn", trigger: "onFirstVisible" },
    },
  },
  {
    type: "elementBody",
    description: "Body copy / paragraph text. Variants: lead (large), standard, fine (small).",
    keyFields: ["type", "text", "variant (lead|standard|fine)", "color"],
    example: {
      type: "elementBody",
      variant: "lead",
      text: "Supporting description text goes here.",
    },
  },
  {
    type: "elementButton",
    description: "CTA or nav button. Variants: primary, secondary, ghost, glass, quiet, utility.",
    keyFields: ["type", "label", "href", "variant (primary|secondary|ghost|glass|quiet)", "action"],
    example: { type: "elementButton", label: "Get started", href: "/contact", variant: "primary" },
  },
  {
    type: "elementImage",
    description: "Image element. Variants: hero (full-bleed), inline, fullCover, feature, crop.",
    keyFields: [
      "type",
      "src",
      "alt",
      "width",
      "height",
      "variant (hero|inline|fullCover|feature|crop)",
      "objectFit",
    ],
    example: {
      type: "elementImage",
      src: "assets/photo.jpg",
      alt: "Description",
      variant: "feature",
      width: "100%",
    },
  },
  {
    type: "elementVideo",
    description: "Video element with poster, HLS, and module controls support.",
    keyFields: [
      "type",
      "src",
      "poster",
      "variant (inline|compact|fullcover|hero)",
      "module",
      "autoPlay",
      "loop",
    ],
    example: {
      type: "elementVideo",
      src: "assets/video.m3u8",
      poster: "assets/poster.jpg",
      variant: "hero",
      autoPlay: true,
      loop: true,
    },
  },
  {
    type: "elementGroup",
    description:
      "Flex/column container. Nests other elements. Supports disclosure (expand/collapse), infinite-scroll-like layouts.",
    keyFields: [
      "type",
      "display",
      "flexDirection",
      "alignItems",
      "justifyContent",
      "gap",
      "padding",
      "section (nested elements)",
      "fill",
      "borderRadius",
    ],
    example: {
      type: "elementGroup",
      display: "flex",
      flexDirection: "column",
      gap: "1rem",
      padding: "1.5rem",
      section: {
        elementOrder: ["heading", "body"],
        definitions: {
          heading: { type: "elementHeading", level: 3, text: "Card title" },
          body: { type: "elementBody", text: "Card content" },
        },
      },
    },
  },
  {
    type: "elementSpacer",
    description: "Empty spacer for vertical/horizontal rhythm. Set height or width.",
    keyFields: ["type", "height", "width"],
    example: { type: "elementSpacer", height: "3rem" },
  },
  {
    type: "elementDivider",
    description: "Horizontal rule / separator line.",
    keyFields: ["type", "color", "thickness", "style"],
    example: { type: "elementDivider", color: "var(--pb-border)", thickness: "1px" },
  },
  {
    type: "elementRichText",
    description: "HTML-formatted rich text. Supports bold, italic, links, lists.",
    keyFields: ["type", "html"],
    example: { type: "elementRichText", html: "<p>Paragraph with <strong>bold</strong> text.</p>" },
  },
  {
    type: "elementLink",
    description: "Inline or nav link text. Variants: inline, emphasis, nav.",
    keyFields: ["type", "label", "href", "variant (inline|emphasis|nav)"],
    example: { type: "elementLink", label: "Learn more", href: "/about", variant: "inline" },
  },
  {
    type: "elementSVG",
    description: "Inline SVG graphic or icon.",
    keyFields: ["type", "src (asset key)", "width", "height", "fill"],
    example: { type: "elementSVG", src: "assets/icon.svg", width: "24px", height: "24px" },
  },
  {
    type: "elementVector",
    description: "Procedural shape or gradient — ring, pill, blob — defined by shape and colors.",
    keyFields: ["type", "shape (ring|pill|blob|rect)", "colors", "gradient"],
    example: {
      type: "elementVector",
      shape: { kind: "ring", radius: 80, stroke: 4 },
      colors: { fill: "var(--pb-accent)" },
    },
  },
  {
    type: "elementAudio",
    description:
      "Audio player element. Supports module (seekbar, waveform) and transport controls.",
    keyFields: ["type", "src", "poster", "module", "autoPlay"],
    example: { type: "elementAudio", src: "assets/track.mp3", module: "audio-player-seekbar" },
  },
  {
    type: "elementModel3D",
    description:
      "3D model viewer (GLTF/GLB). Supports camera presets, animations, material overrides.",
    keyFields: ["type", "src", "poster", "cameraPresets", "animations"],
    example: { type: "elementModel3D", src: "assets/model.glb", poster: "assets/model-poster.jpg" },
  },
  {
    type: "elementRive",
    description: "Rive animation (.riv file). Supports state machines and inputs.",
    keyFields: ["type", "src", "artboard", "stateMachine", "inputs"],
    example: { type: "elementRive", src: "assets/animation.riv", stateMachine: "State Machine 1" },
  },
  {
    type: "elementLottie",
    description: "Lottie animation (.json). Supports loop, autoplay, playback controls.",
    keyFields: ["type", "src", "loop", "autoPlay", "speed"],
    example: { type: "elementLottie", src: "assets/animation.json", loop: true, autoPlay: true },
  },
  {
    type: "elementMarquee",
    description: "Horizontally scrolling marquee ticker. Repeats child content.",
    keyFields: ["type", "speed", "direction", "pauseOnHover", "section (content to scroll)"],
    example: {
      type: "elementMarquee",
      speed: 40,
      pauseOnHover: true,
      section: {
        elementOrder: ["text"],
        definitions: { text: { type: "elementBody", text: "Rolling content · " } },
      },
    },
  },
  {
    type: "elementCounter",
    description: "Animated number counter that counts up/down to a target value on visibility.",
    keyFields: ["type", "to", "from", "duration", "format (prefix/suffix)", "decimals"],
    example: { type: "elementCounter", from: 0, to: 10000, duration: 2, format: { suffix: "+" } },
  },
  {
    type: "elementImageCompare",
    description: "Before/after image slider with draggable divider.",
    keyFields: ["type", "before (image element)", "after (image element)", "orientation"],
    example: {
      type: "elementImageCompare",
      before: { src: "assets/before.jpg", alt: "Before" },
      after: { src: "assets/after.jpg", alt: "After" },
      orientation: "horizontal",
    },
  },
  {
    type: "elementTabs",
    description: "Tabbed interface with multiple panels. Each tab has a label and nested section.",
    keyFields: ["type", "tabs (array of {label, section})", "defaultTab", "variant"],
    example: {
      type: "elementTabs",
      tabs: [
        {
          label: "Tab 1",
          section: {
            elementOrder: ["body"],
            definitions: { body: { type: "elementBody", text: "Tab 1 content" } },
          },
        },
        {
          label: "Tab 2",
          section: {
            elementOrder: ["body"],
            definitions: { body: { type: "elementBody", text: "Tab 2 content" } },
          },
        },
      ],
    },
  },
  {
    type: "elementTooltip",
    description: "Element with a tooltip popup on hover.",
    keyFields: ["type", "trigger (element to hover)", "content (tooltip content)", "placement"],
    example: {
      type: "elementTooltip",
      placement: "top",
      trigger: { type: "elementBody", text: "Hover me" },
      content: { type: "elementBody", text: "Tooltip text" },
    },
  },
  {
    type: "elementDrag",
    description: "Draggable element with physics-based motion. Drag within container bounds.",
    keyFields: ["type", "axis (x|y|both)", "bounds", "section (content)"],
    example: {
      type: "elementDrag",
      axis: "both",
      section: {
        elementOrder: ["card"],
        definitions: { card: { type: "elementBody", text: "Drag me" } },
      },
    },
  },
  {
    type: "elementInfiniteScroll",
    description:
      "Snapping scroll container — like a carousel or story viewer. Repeats items infinitely.",
    keyFields: ["type", "scrollDirection (horizontal|vertical)", "snapAlign", "loop", "section"],
    example: {
      type: "elementInfiniteScroll",
      scrollDirection: "horizontal",
      snapAlign: "center",
      loop: true,
      section: {
        elementOrder: ["a", "b", "c"],
        definitions: {
          a: { type: "elementImage", src: "assets/1.jpg", alt: "" },
          b: { type: "elementImage", src: "assets/2.jpg", alt: "" },
          c: { type: "elementImage", src: "assets/3.jpg", alt: "" },
        },
      },
    },
  },
  {
    type: "elementRange",
    description: "Slider input (range). Emits values as variables.",
    keyFields: ["type", "min", "max", "step", "variable"],
    example: { type: "elementRange", min: 0, max: 100, step: 1, variable: "sliderValue" },
  },
  {
    type: "elementInput",
    description: "Text/number/email input. Writes to a named variable.",
    keyFields: ["type", "inputType (text|email|number|password)", "placeholder", "variable"],
    example: {
      type: "elementInput",
      inputType: "email",
      placeholder: "Enter your email",
      variable: "emailValue",
    },
  },
  {
    type: "elementFormField",
    description: "Form field inside a formBlock section. Supports text, select, radio, checkbox.",
    keyFields: [
      "type",
      "fieldType (text|email|textarea|select|radio|checkbox)",
      "name",
      "label",
      "required",
    ],
    example: {
      type: "elementFormField",
      fieldType: "email",
      name: "email",
      label: "Email address",
      required: true,
    },
  },
  {
    type: "elementScrollProgressBar",
    description: "Visual progress bar that fills as the user scrolls down the page.",
    keyFields: ["type", "orientation (horizontal|vertical)", "fill", "height"],
    example: {
      type: "elementScrollProgressBar",
      orientation: "horizontal",
      fill: "var(--pb-accent)",
      height: "3px",
    },
  },
  {
    type: "elementVideoTime",
    description: "Displays current playback time of the nearest elementVideo ancestor.",
    keyFields: ["type", "format (current|duration|remaining)"],
    example: { type: "elementVideoTime", format: "current" },
  },
  {
    type: "elementVideoQualitySelect",
    description: "Quality selector dropdown for HLS video streams.",
    keyFields: ["type"],
    example: { type: "elementVideoQualitySelect" },
  },
];

// ── Section catalog ──────────────────────────────────────────────────────────

const SECTION_CATALOG: Array<{
  type: string;
  description: string;
  keyFields: string[];
  example: object;
  systemOnly?: boolean;
}> = [
  {
    type: "contentBlock",
    description:
      "Primary content container. Flex layout. Most pages start here for hero/intro sections.",
    keyFields: [
      "type",
      "elements[]",
      "flexDirection (column|row)",
      "alignItems",
      "justifyContent",
      "gap",
      "padding",
      "fill",
      "background",
      "contentWidth",
      "motion",
    ],
    example: {
      type: "contentBlock",
      background: { type: "backgroundVariable", layers: [{ fill: "var(--pb-secondary)" }] },
      padding: ["4rem 1.5rem", "8rem 4rem"],
      elements: [
        { type: "elementHeading", level: 1, variant: "display", text: "Page headline" },
        { type: "elementBody", variant: "lead", text: "Supporting description." },
        { type: "elementButton", label: "Get started", href: "/contact", variant: "primary" },
      ],
    },
  },
  {
    type: "sectionColumn",
    description:
      "CSS Grid layout — cards, features, gallery grids. Use `columns` to set column count. Each element in `elements[]` becomes a grid cell.",
    keyFields: [
      "type",
      "columns (number or [mobile,desktop])",
      "elements[]",
      "columnGaps",
      "gridAutoRows",
      "padding",
      "background",
      "motion",
    ],
    example: {
      type: "sectionColumn",
      columns: [1, 3],
      columnGaps: ["1rem", "1.5rem"],
      padding: ["3rem 1.5rem", "5rem 4rem"],
      elements: [
        {
          preset: "card-feature-basic",
          definitions: {
            heading: { type: "elementHeading", level: 3, text: "Feature one" },
            body: { type: "elementBody", text: "Description" },
          },
        },
        {
          preset: "card-feature-basic",
          definitions: {
            heading: { type: "elementHeading", level: 3, text: "Feature two" },
            body: { type: "elementBody", text: "Description" },
          },
        },
        {
          preset: "card-feature-basic",
          definitions: {
            heading: { type: "elementHeading", level: 3, text: "Feature three" },
            body: { type: "elementBody", text: "Description" },
          },
        },
      ],
    },
  },
  {
    type: "scrollContainer",
    description: "Horizontal or vertical scroll container. Use for scroll-driven interactions.",
    keyFields: [
      "type",
      "elements[]",
      "scrollDirection (horizontal|vertical|both)",
      "scrollProgressTrigger",
    ],
    example: {
      type: "scrollContainer",
      scrollDirection: "horizontal",
      elements: [
        { type: "elementImage", src: "assets/a.jpg", alt: "Image A", width: "300px" },
        { type: "elementImage", src: "assets/b.jpg", alt: "Image B", width: "300px" },
      ],
    },
  },
  {
    type: "formBlock",
    description:
      "HTML form section. Use for contact, newsletter, waitlist. Fields are formBlock's own `fields[]` array — not elementFormField elements.",
    keyFields: [
      "type",
      "fields[]",
      "action (contact|newsletter|waitlist|etc)",
      "padding",
      "background",
    ],
    example: {
      type: "formBlock",
      action: "contact",
      padding: "3rem 2rem",
      fields: [
        {
          type: "elementFormField",
          fieldType: "text",
          name: "name",
          label: "Your name",
          required: true,
        },
        {
          type: "elementFormField",
          fieldType: "email",
          name: "email",
          label: "Email",
          required: true,
        },
        { type: "elementFormField", fieldType: "textarea", name: "message", label: "Message" },
      ],
    },
  },
  {
    type: "revealSection",
    description: "Expand/collapse section. Can be triggered by hover, click, or external variable.",
    keyFields: [
      "type",
      "triggerMode (hover|click|button|external)",
      "collapsedElements[]",
      "revealedElements[]",
      "expandAxis",
      "revealPreset",
    ],
    example: {
      type: "revealSection",
      triggerMode: "hover",
      expandAxis: "vertical",
      revealPreset: "slideUp",
      collapsedElements: [{ type: "elementBody", text: "Click to expand..." }],
      revealedElements: [{ type: "elementBody", text: "Full content here." }],
    },
  },
  {
    type: "divider",
    description: "Empty section used as a visual spacer or section separator. No content.",
    keyFields: ["type", "height", "background", "fill"],
    example: { type: "divider", height: "2px", fill: "var(--pb-border)" },
  },
  {
    type: "sectionTrigger",
    description:
      "SYSTEM: Invisible trigger section that fires actions on scroll/visibility. Not used for visual content.",
    keyFields: ["type", "onVisible", "onInvisible", "threshold"],
    example: {
      type: "sectionTrigger",
      threshold: 0.5,
      onVisible: { type: "setVariable", payload: { key: "heroVisible", value: true } },
    },
    systemOnly: true,
  },
  {
    type: "pageTrigger",
    description: "SYSTEM: Fires actions on page mount/unmount. Not used for visual content.",
    keyFields: ["type", "onMount", "onUnmount"],
    example: {
      type: "pageTrigger",
      onMount: { type: "setVariable", payload: { key: "pageLoaded", value: true } },
    },
    systemOnly: true,
  },
];

// ── Background catalog ────────────────────────────────────────────────────────

const BACKGROUND_CATALOG: Array<{
  type: string;
  description: string;
  keyFields: string[];
  example: object;
}> = [
  {
    type: "backgroundVariable",
    description:
      "CSS gradient-based background. Multiple layers composited together. Most versatile — supports animated gradients, aurora effects, mesh gradients. Use theme tokens for colors.",
    keyFields: ["type", "layers[] ({ fill, blendMode, opacity, backgroundSize, motion[] })"],
    example: {
      type: "backgroundVariable",
      layers: [
        { fill: "var(--pb-secondary)" },
        {
          fill: "radial-gradient(ellipse 80% 50% at 50% 0%, color-mix(in oklab, var(--pb-accent) 25%, transparent), transparent)",
        },
      ],
    },
  },
  {
    type: "backgroundImage",
    description: "Static image background. Full-bleed cover by default.",
    keyFields: ["type", "image (asset key or URL)"],
    example: { type: "backgroundImage", image: "assets/hero-bg.jpg" },
  },
  {
    type: "backgroundVideo",
    description: "Looping video background. Requires poster for SSR/loading.",
    keyFields: ["type", "video (asset key)", "poster (required)", "overlay (color tint)"],
    example: {
      type: "backgroundVideo",
      video: "assets/bg-loop.m3u8",
      poster: "assets/bg-poster.jpg",
      overlay: "#00000060",
    },
  },
  {
    type: "backgroundPattern",
    description: "Repeating pattern tile background. Good for subtle textures.",
    keyFields: ["type", "image (asset key or URL)", "repeat (repeat|repeat-x|repeat-y|no-repeat)"],
    example: { type: "backgroundPattern", image: "assets/pattern-dots.svg", repeat: "repeat" },
  },
  {
    type: "backgroundTransition",
    description:
      "Animated crossfade between two backgrounds. Triggered by scroll progress or user action.",
    keyFields: [
      "type",
      "from (any bg type)",
      "to (any bg type)",
      "mode (progress|time)",
      "duration",
      "progressRange",
    ],
    example: {
      type: "backgroundTransition",
      mode: "progress",
      from: { type: "backgroundVariable", layers: [{ fill: "var(--pb-secondary)" }] },
      to: { type: "backgroundVariable", layers: [{ fill: "var(--pb-primary)" }] },
      progressRange: { variable: "scrollProgress", input: [0, 1] },
    },
  },
];

// ── Module catalog ────────────────────────────────────────────────────────────

function buildModuleCatalog(root: string): string {
  const modulesDir = path.join(root, "content/modules");
  const files = findFiles(modulesDir);
  const entries: string[] = [];
  for (const file of files.sort()) {
    const id = path.basename(file, ".json");
    const data = readJson(file) as Record<string, unknown> | null;
    if (!data) continue;
    const contextType = (data.contextType as string) ?? "unknown";
    entries.push(
      [
        `### ${id}`,
        ``,
        `**Context type:** \`${contextType}\``,
        `**File:** \`content/modules/${id}.json\``,
        ``,
        `**Usage:** Use \`"module": "${id}"\` on an \`elementVideo\` or \`elementAudio\` element.`,
        ``,
        `\`\`\`json`,
        `{ "type": "elementVideo", "src": "assets/video.m3u8", "poster": "assets/poster.jpg", "module": "${id}" }`,
        `\`\`\``,
      ].join("\n")
    );
  }
  return entries.join("\n\n");
}

// ── Motion catalog ────────────────────────────────────────────────────────────

function buildMotionCatalog(root: string): string {
  const presetsFile = path.join(root, "content/framer-motion/framer-motion-presets.json");
  const data = readJson(presetsFile) as Record<string, Record<string, unknown>> | null;
  if (!data) return "<!-- framer-motion-presets.json not found -->";

  const lines: string[] = [];

  lines.push("## Entrance Presets\n");
  lines.push("Apply via `motionTiming.entrancePreset` on any element or section.\n");
  lines.push("```json");
  lines.push(`{ "motionTiming": { "entrancePreset": "<name>", "trigger": "onFirstVisible" } }`);
  lines.push("```\n");

  const entrance = data["entrancePresets"] ?? {};
  lines.push("| Preset | Description |");
  lines.push("|--------|-------------|");
  for (const name of Object.keys(entrance).sort()) {
    const desc: Record<string, string> = {
      fade: "Fade in from transparent",
      slideUp: "Slide up from below",
      slideDown: "Slide down from above",
      slideLeft: "Slide in from left",
      slideRight: "Slide in from right",
      zoomIn: "Scale up from smaller",
      zoomOut: "Scale down from larger",
      popIn: "Pop in with spring bounce",
      blurIn: "Blur → sharp reveal",
      tiltIn: "Tilt perspective entry",
    };
    lines.push(`| \`${name}\` | ${desc[name] ?? "Entrance animation"} |`);
  }

  lines.push("\n## Exit Presets\n");
  lines.push("Apply via `motionTiming.exitPreset` on any element.\n");
  const exit = data["exitPresets"] ?? {};
  lines.push("| Preset | Description |");
  lines.push("|--------|-------------|");
  for (const name of Object.keys(exit).sort()) {
    lines.push(`| \`${name}\` | Exit animation |`);
  }

  lines.push(`
## Stagger Pattern

Stagger children with \`motionTiming.staggerChildren\`:

\`\`\`json
{
  "motionTiming": {
    "entrancePreset": "slideUp",
    "trigger": "onFirstVisible",
    "staggerChildren": 0.08,
    "delayChildren": 0.1
  }
}
\`\`\`

## Background Layer Motion

Animate background layers with \`motion[]\` array on each layer:

\`\`\`json
{
  "type": "backgroundVariable",
  "layers": [{
    "fill": "linear-gradient(...)",
    "backgroundSize": "300% 300%",
    "motion": [{ "type": "loop", "duration": 8, "ease": "linear" }]
  }]
}
\`\`\`

Motion types for bg layers: \`loop\`, \`scroll\`, \`parallax\`, \`pointer\`, \`trigger\`, \`entrance\`

## Motion Props (whileHover, whileTap, gesture)

Available on any element via the layout \`motion\` field:

\`\`\`json
{
  "motion": {
    "whileHover": { "y": -4, "scale": 1.02 },
    "transition": { "duration": 0.18 }
  }
}
\`\`\`
`);

  return lines.join("\n");
}

// ── Preset catalog ────────────────────────────────────────────────────────────

const GENERATION_FAMILIES = [
  "bg",
  "card",
  "demo",
  "layout",
  "type/core",
  "type/effects",
  "type/motion",
  "type/patterns",
  "type/special",
  "ui/button",
  "ui/link",
];

function buildPresetCatalog(root: string): string {
  const presetsDir = path.join(root, "content/presets");
  const lines: string[] = [];

  for (const family of GENERATION_FAMILIES) {
    const dir = path.join(presetsDir, family);
    const files = findFiles(dir).sort();
    if (files.length === 0) continue;

    lines.push(`## ${family}`);
    lines.push("");

    for (const file of files) {
      const id = path.basename(file, ".json");
      const data = readJson(file) as Record<string, unknown> | null;
      if (!data) continue;
      const elementType = (data.type as string) ?? "—";
      const variant = (data.variant as string | undefined) ?? "";
      const variantStr = variant ? ` (variant: \`${variant}\`)` : "";
      lines.push(`- **\`${id}\`** — \`${elementType}\`${variantStr}`);
    }
    lines.push("");
  }

  lines.push("## How to use presets\n");
  lines.push("Reference a preset by key in any definition. Add override fields directly:");
  lines.push("```json");
  lines.push(`{
  "hero-title": {
    "preset": "type-h1-display",
    "text": "Your actual headline"
  },
  "cta-btn": {
    "preset": "btn-primary",
    "label": "Get started",
    "href": "/contact"
  },
  "feature-card": {
    "preset": "card-feature-basic",
    "definitions": {
      "heading": { "type": "elementHeading", "level": 3, "text": "Feature name" },
      "body": { "type": "elementBody", "text": "Description" }
    }
  }
}`);
  lines.push("```");

  return lines.join("\n");
}

// ── Trigger actions catalog ───────────────────────────────────────────────────

const COMMON_ACTIONS = new Set([
  "navigate",
  "scrollTo",
  "scrollLock",
  "scrollUnlock",
  "modalOpen",
  "modalClose",
  "modalToggle",
  "setVariable",
  "toggleVariable",
  "conditionalAction",
  "elementToggle",
  "assetTogglePlay",
  "assetPlay",
  "assetPause",
  "assetSeek",
  "assetSetVolume",
  "assetMute",
  "assetUnmute",
  "assetToggleMute",
  "setTheme",
  "setDocumentTitle",
  "playSound",
  "stopSound",
  "copyToClipboard",
  "dispatchCustomEvent",
  "noop",
]);

function buildTriggerCatalog(): string {
  const summaries = listActionTypeSummaries();
  const lines: string[] = [];

  lines.push("## Common Actions (generation-relevant)\n");
  const common = summaries.filter((s) => COMMON_ACTIONS.has(s.type));
  for (const { type, payload } of common) {
    const payloadStr =
      payload.length > 0 ? payload.map((p) => `\`${p.key}: ${p.type}\``).join(", ") : "no payload";
    lines.push(`### \`${type}\``);
    lines.push(`Payload: ${payloadStr}`);
    lines.push("");
  }

  lines.push("## Action Trigger Patterns\n");
  lines.push(
    "Actions fire from: `onVisible`, `onInvisible`, `onMount`, `onUnmount`, element `interactions.onClick`,"
  );
  lines.push(
    "`interactions.onHoverEnter`, `interactions.onHoverLeave`, `keyboardTriggers[]`, `timerTriggers[]`,"
  );
  lines.push("`scrollThresholdTriggers[]`, `elementEventTriggers[]`, `customEventTriggers[]`.\n");
  lines.push("```json");
  lines.push(`{
  "interactions": {
    "onClick": { "type": "navigate", "payload": { "href": "/page" } }
  }
}

{
  "onVisible": { "type": "setVariable", "payload": { "key": "sectionSeen", "value": true } },
  "triggerOnce": true,
  "threshold": 0.3
}

{
  "timerTriggers": [{
    "delay": 2000,
    "action": { "type": "setVariable", "payload": { "key": "showBanner", "value": true } },
    "maxFires": 1
  }]
}`);
  lines.push("```\n");

  lines.push("## Full Action Type List\n");
  lines.push("| Action | Payload fields |");
  lines.push("|--------|----------------|");
  for (const { type, payload } of summaries) {
    const payloadStr = payload.length > 0 ? payload.map((p) => `${p.key}`).join(", ") : "—";
    lines.push(`| \`${type}\` | ${payloadStr} |`);
  }

  return lines.join("\n");
}

// ── Writers ───────────────────────────────────────────────────────────────────

function writeElementCatalog(outDir: string): void {
  const lines: string[] = [
    "# Element Catalog\n",
    "All 29 Peblor element types for page generation.\n",
  ];
  const generatable = ELEMENT_CATALOG.filter(
    (e) => !["elementVideoTime", "elementVideoQualitySelect"].includes(e.type)
  );
  const specialized = ELEMENT_CATALOG.filter((e) =>
    ["elementVideoTime", "elementVideoQualitySelect"].includes(e.type)
  );

  for (const el of generatable) {
    lines.push(`## \`${el.type}\``);
    lines.push("");
    lines.push(el.description);
    lines.push("");
    lines.push(`**Key fields:** ${el.keyFields.join(", ")}`);
    lines.push("");
    lines.push("```json");
    lines.push(trimmedJson(el.example, 500));
    lines.push("```");
    lines.push("");
  }

  if (specialized.length > 0) {
    lines.push("---\n## Specialized (use inside video player context)\n");
    for (const el of specialized) {
      lines.push(`- **\`${el.type}\`** — ${el.description}`);
    }
  }

  fs.writeFileSync(path.join(outDir, "element-catalog.md"), lines.join("\n"));
}

function writeSectionCatalog(outDir: string): void {
  const lines: string[] = [
    "# Section Catalog\n",
    "All 8 Peblor section types. Types marked SYSTEM are not for visual content.\n",
  ];
  for (const sec of SECTION_CATALOG) {
    const tag = sec.systemOnly ? " *(system-only)*" : "";
    lines.push(`## \`${sec.type}\`${tag}`);
    lines.push("");
    lines.push(sec.description);
    lines.push("");
    lines.push(`**Key fields:** ${sec.keyFields.join(", ")}`);
    lines.push("");
    lines.push("```json");
    lines.push(trimmedJson(sec.example, 800));
    lines.push("```");
    lines.push("");
  }
  fs.writeFileSync(path.join(outDir, "section-catalog.md"), lines.join("\n"));
}

function writeBackgroundCatalog(outDir: string): void {
  const lines: string[] = [
    "# Background Catalog\n",
    "All 5 Peblor background types. Set on any section as `background: { type: ... }`.\n",
    "**Important:** Most pages should use background presets from `content/presets/bg/` rather than inline definitions. See preset-catalog.md.\n",
  ];
  for (const bg of BACKGROUND_CATALOG) {
    lines.push(`## \`${bg.type}\``);
    lines.push("");
    lines.push(bg.description);
    lines.push("");
    lines.push(`**Key fields:** ${bg.keyFields.join(", ")}`);
    lines.push("");
    lines.push("```json");
    lines.push(trimmedJson(bg.example, 600));
    lines.push("```");
    lines.push("");
  }
  fs.writeFileSync(path.join(outDir, "background-catalog.md"), lines.join("\n"));
}

function writeMotionCatalog(root: string, outDir: string): void {
  const content = ["# Motion Catalog\n", buildMotionCatalog(root)].join("\n");
  fs.writeFileSync(path.join(outDir, "motion-catalog.md"), content);
}

function writeTriggerCatalog(outDir: string): void {
  const content = ["# Trigger Action Catalog\n", buildTriggerCatalog()].join("\n");
  fs.writeFileSync(path.join(outDir, "trigger-catalog.md"), content);
}

function writeModuleCatalog(root: string, outDir: string): void {
  const content = [
    "# Module Catalog\n",
    "Modules are self-contained player configurations. Use the `module` field on `elementVideo` or `elementAudio`.\n",
    buildModuleCatalog(root),
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "module-catalog.md"), content);
}

function writePresetCatalog(root: string, outDir: string): void {
  const content = [
    "# Preset Catalog\n",
    "Generation-relevant presets grouped by family. 97+ presets available — these are the most useful for page generation.\n",
    buildPresetCatalog(root),
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "preset-catalog.md"), content);
}

// ── Command entry point ───────────────────────────────────────────────────────

export async function runGenerateCatalogs(args: string[], io: CommandIo): Promise<number> {
  const help = args.includes("--help") || args.includes("-h");
  if (help) {
    io.printText("Usage: pb-cli generate-catalogs [--out <dir>]");
    io.printText("");
    io.printText("Generates reference catalog markdown files for AI page generation.");
    io.printText("Default output: .claude/skills/peblor-page-generator/references/");
    return 0;
  }

  let root: string;
  try {
    root = findProjectRoot();
  } catch (e) {
    io.printErrorText(`Error: ${e instanceof Error ? e.message : String(e)}`);
    return 2;
  }

  const outDirArg = args.indexOf("--out");
  const outDir =
    outDirArg >= 0 && args[outDirArg + 1]
      ? path.resolve(args[outDirArg + 1]!)
      : path.join(root, ".claude/skills/peblor-page-generator/references");

  fs.mkdirSync(outDir, { recursive: true });

  io.printText(`Generating catalogs → ${outDir}`);

  writeElementCatalog(outDir);
  io.printText("  ✓ element-catalog.md");

  writeSectionCatalog(outDir);
  io.printText("  ✓ section-catalog.md");

  writeBackgroundCatalog(outDir);
  io.printText("  ✓ background-catalog.md");

  writeMotionCatalog(root, outDir);
  io.printText("  ✓ motion-catalog.md");

  writeTriggerCatalog(outDir);
  io.printText("  ✓ trigger-catalog.md");

  writeModuleCatalog(root, outDir);
  io.printText("  ✓ module-catalog.md");

  writePresetCatalog(root, outDir);
  io.printText("  ✓ preset-catalog.md");

  io.printText("");
  io.printText("All 7 catalogs generated.");

  return 0;
}

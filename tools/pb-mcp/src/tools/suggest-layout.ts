import type { Tool } from "../types.js";

const SECTION_TYPES = [
  "contentBlock",
  "sectionColumn",
  "scrollContainer",
  "revealSection",
  "divider",
  "formBlock",
];

const LAYOUT_TEMPLATES: Array<{
  name: string;
  description: string;
  sections: Array<{ key: string; type: string; elements: string[] }>;
}> = [
  {
    name: "hero-body",
    description:
      "A single content block with heading and body text — good for simple landing pages.",
    sections: [{ key: "hero", type: "contentBlock", elements: ["elementHeading", "elementText"] }],
  },
  {
    name: "hero-cta",
    description: "Heading + body + call-to-action button — standard marketing page.",
    sections: [
      {
        key: "hero",
        type: "contentBlock",
        elements: ["elementHeading", "elementText", "elementButton"],
      },
    ],
  },
  {
    name: "hero-image-cta",
    description: "Full-page hero with image, heading, and CTA.",
    sections: [
      {
        key: "hero",
        type: "contentBlock",
        elements: ["elementImage", "elementHeading", "elementButton"],
      },
    ],
  },
  {
    name: "hero-features",
    description: "Hero section followed by a column grid of feature items.",
    sections: [
      { key: "hero", type: "contentBlock", elements: ["elementHeading", "elementText"] },
      { key: "features", type: "sectionColumn", elements: ["elementHeading", "elementText"] },
    ],
  },
  {
    name: "gallery",
    description: "Grid of images or media items — good for portfolio/work pages.",
    sections: [
      { key: "header", type: "contentBlock", elements: ["elementHeading"] },
      { key: "gallery", type: "sectionColumn", elements: ["elementImage"] },
    ],
  },
  {
    name: "long-form",
    description: "Multi-section article or case study with hero, body sections, and CTA.",
    sections: [
      { key: "hero", type: "contentBlock", elements: ["elementHeading", "elementText"] },
      { key: "body", type: "contentBlock", elements: ["elementText"] },
      { key: "cta", type: "contentBlock", elements: ["elementButton"] },
    ],
  },
  {
    name: "video-hero",
    description: "Full-bleed video with optional heading overlay.",
    sections: [{ key: "hero", type: "contentBlock", elements: ["elementVideo", "elementHeading"] }],
  },
  {
    name: "contact-form",
    description: "Contact or sign-up page with form.",
    sections: [
      { key: "hero", type: "contentBlock", elements: ["elementHeading", "elementText"] },
      { key: "form", type: "formBlock", elements: [] },
    ],
  },
];

export const suggestLayout: Tool = {
  def: {
    name: "suggest_layout",
    description:
      "Given a list of content goals or an intent string for a page, suggest ranked section layout options with appropriate section types and element clusters.",
    inputSchema: {
      type: "object",
      properties: {
        intent: {
          type: "string",
          description: "Natural-language description of the page purpose",
        },
        sectionCount: {
          type: "number",
          description: "Preferred number of sections (optional filter)",
        },
        kind: {
          type: "string",
          description: "Focus on a specific kind of layout",
        },
      },
      required: ["intent"],
    },
  },
  run: async (args) => {
    const { intent, sectionCount } = args as {
      intent: string;
      sectionCount?: number;
      kind?: string;
    };

    const intentLower = intent.toLowerCase();
    const scored = LAYOUT_TEMPLATES.map((tmpl) => {
      let score = 0;
      const descLower = tmpl.description.toLowerCase();
      const nameLower = tmpl.name.toLowerCase();
      const intentWords = intentLower.split(/\s+/);
      for (const word of intentWords) {
        if (descLower.includes(word) || nameLower.includes(word)) score += 2;
      }
      if (intentLower.includes("video") && tmpl.name.includes("video")) score += 5;
      if (intentLower.includes("gallery") && tmpl.name.includes("gallery")) score += 5;
      if (intentLower.includes("contact") && tmpl.name.includes("form")) score += 5;
      if (intentLower.includes("portfolio") && tmpl.name.includes("gallery")) score += 5;
      if (intentLower.includes("landing") && tmpl.name.includes("cta")) score += 3;
      return { ...tmpl, score };
    })
      .filter((t) => !sectionCount || t.sections.length === sectionCount)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ score: _score, ...tmpl }) => tmpl);

    return {
      intent,
      suggestions: scored,
      availableSectionTypes: SECTION_TYPES,
      note: "Each suggestion is a starting point — combine or adjust sections as needed.",
    };
  },
};

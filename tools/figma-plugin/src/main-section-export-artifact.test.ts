import { describe, expect, it } from "vitest";
import {
  buildSectionExportArtifact,
  inferSectionBackgroundCandidate,
} from "./main-section-export-artifact";

describe("buildSectionExportArtifact", () => {
  it("builds artifact from page output", () => {
    const artifact = buildSectionExportArtifact(
      {
        pages: {
          "case-study": {
            slug: "case-study",
            title: "Case Study",
            sectionOrder: ["hero"],
            definitions: {
              hero: { type: "contentBlock", id: "hero", elements: [] },
            },
          },
        },
        presets: {},
        modals: {},
        modules: {},
        globals: {},
        assets: [],
        warnings: [],
        elementCount: 0,
      },
      {
        id: "1:2",
        name: "Hero",
        target: { type: "page", key: "case-study", label: "Case Study" },
        issues: [],
      }
    );

    expect(artifact).toMatchObject({
      sectionId: "hero",
      paths: {
        index: "content/pages/case-study/index.json",
        section: "content/pages/case-study/hero.json",
      },
      indexPatch: {
        slug: "case-study",
        sectionOrder: ["hero"],
      },
    });
  });

  it("builds artifact from preset output", () => {
    const artifact = buildSectionExportArtifact(
      {
        pages: {},
        presets: {
          "hero-dark": {
            type: "contentBlock",
            elements: [],
          },
        },
        modals: {},
        modules: {},
        globals: {},
        assets: [],
        warnings: [],
        elementCount: 0,
      },
      {
        id: "1:3",
        name: "Hero Dark",
        target: { type: "preset", key: "hero-dark", label: "Hero Dark" },
        issues: [],
      }
    );

    expect(artifact).toMatchObject({
      sectionId: "hero-dark",
      section: {
        id: "hero-dark",
      },
      paths: {
        index: "content/pages/hero-dark/index.json",
        section: "content/pages/hero-dark/hero-dark.json",
      },
    });
  });

  it("builds artifact from modal output", () => {
    const artifact = buildSectionExportArtifact(
      {
        pages: {},
        presets: {},
        modals: {
          "contact-modal": {
            id: "contact-modal",
            title: "Contact Modal",
            sectionOrder: ["intro"],
            definitions: {
              intro: { type: "contentBlock", id: "intro", elements: [] },
            },
          },
        },
        modules: {},
        globals: {},
        assets: [],
        warnings: [],
        elementCount: 0,
      },
      {
        id: "1:4",
        name: "Modal/Contact",
        target: { type: "modal", key: "contact-modal", label: "Contact Modal" },
        issues: [],
      }
    );

    expect(artifact).toMatchObject({
      sectionId: "intro",
      section: {
        id: "intro",
      },
      paths: {
        index: "content/pages/contact-modal/index.json",
        section: "content/pages/contact-modal/intro.json",
      },
    });
  });

  it("attaches page backgroundCandidate metadata when section includes background fields", () => {
    const artifact = buildSectionExportArtifact(
      {
        pages: {
          "case-study": {
            slug: "case-study",
            title: "Case Study",
            sectionOrder: ["hero"],
            definitions: {
              hero: { type: "contentBlock", id: "hero", bgImage: "hero/bg.png", elements: [] },
            },
          },
        },
        presets: {},
        modals: {},
        modules: {},
        globals: {},
        assets: [],
        warnings: [],
        elementCount: 0,
      },
      {
        id: "1:5",
        name: "Hero",
        target: { type: "page", key: "case-study", label: "Case Study" },
        issues: [],
      }
    );

    expect(artifact?.backgroundCandidate).toEqual({
      reason: "section-bgimage",
      bgKey: "hero-bg",
      definition: { type: "backgroundImage", image: "hero/bg.png" },
    });
  });
});

describe("inferSectionBackgroundCandidate", () => {
  it("prefers bgImage over layers/fill", () => {
    expect(
      inferSectionBackgroundCandidate(
        {
          bgImage: "hero/bg.png",
          layers: [{ fill: "linear-gradient(black, white)" }],
          fill: "#111111",
        } as Record<string, unknown>,
        "hero"
      )
    ).toEqual({
      reason: "section-bgimage",
      bgKey: "hero-bg",
      definition: { type: "backgroundImage", image: "hero/bg.png" },
    });
  });

  it("returns undefined when no background-like fields are present", () => {
    expect(inferSectionBackgroundCandidate({ type: "contentBlock" }, "hero")).toBeUndefined();
  });
});

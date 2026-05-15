import { describe, expect, it } from "vitest";
import { bgBlockSchema } from "./background-block-schemas";
import { elementButtonSchema } from "./element-button-schemas";
import { elementHeadingSchema } from "./element-content-schemas";
import { formFieldBlockSchema } from "./form-field-schemas";
import {
  knownPageTagsConfigSchema,
  peblorSchema,
  pageScrollConfigSchema,
  validateKnownFilterCategories,
  validateKnownPageTags,
  validatePageReferences,
} from "./page-definition-and-resolution-schemas";
import {
  sectionContentBlockSchema,
  sectionFormBlockSchema,
  sectionRevealSchema,
} from "./section-block-base-schemas";
import { themeStringSchema } from "./schema-primitives";
import { evaluateConditions } from "../peblor-condition-evaluator";

describe("phase 0 schema hardening", () => {
  describe("elementButton.action", () => {
    it("rejects unknown actions", () => {
      const result = elementButtonSchema.safeParse({
        type: "elementButton",
        action: "unknownAction",
      });
      expect(result.success).toBe(false);
    });

    it("accepts enum-backed actions with required payload", () => {
      const result = elementButtonSchema.safeParse({
        type: "elementButton",
        action: "modalOpen",
        actionPayload: { id: "test-modal" },
      });
      expect(result.success).toBe(true);
    });

    it("rejects enum-backed actions without required payload", () => {
      const result = elementButtonSchema.safeParse({
        type: "elementButton",
        action: "modalOpen",
      });
      expect(result.success).toBe(false);
    });

    it("accepts newly parity-mapped actions", () => {
      // back requires no payload
      expect(
        elementButtonSchema.safeParse({
          type: "elementButton",
          action: "back",
        }).success
      ).toBe(true);
      // contentOverride requires payload
      expect(
        elementButtonSchema.safeParse({
          type: "elementButton",
          action: "contentOverride",
          actionPayload: { key: "test", value: "hello" },
        }).success
      ).toBe(true);
      // rive.fireTrigger has optional payload
      expect(
        elementButtonSchema.safeParse({
          type: "elementButton",
          action: "rive.fireTrigger",
        }).success
      ).toBe(true);
    });

    it("treats JSON null like omitted for optional fields (SCHEMA-2)", () => {
      expect(
        elementButtonSchema.safeParse({
          type: "elementButton",
          action: "back",
          label: null,
          width: null,
          marginTop: null,
        }).success
      ).toBe(true);
      expect(
        elementHeadingSchema.safeParse({
          type: "elementHeading",
          text: "Title",
          fontFamily: null,
          level: null,
        }).success
      ).toBe(true);
    });
  });

  describe("form field combos", () => {
    it("requires options for select/radio/checkboxGroup fields", () => {
      expect(
        formFieldBlockSchema.safeParse({
          type: "formField",
          fieldType: "select",
        }).success
      ).toBe(false);

      expect(
        formFieldBlockSchema.safeParse({
          type: "formField",
          fieldType: "radio",
          options: [],
        }).success
      ).toBe(false);

      expect(
        formFieldBlockSchema.safeParse({
          type: "formField",
          fieldType: "checkboxGroup",
        }).success
      ).toBe(false);
    });

    it("requires label for submit fields", () => {
      expect(
        formFieldBlockSchema.safeParse({
          type: "formField",
          fieldType: "submit",
        }).success
      ).toBe(false);
      expect(
        formFieldBlockSchema.safeParse({
          type: "formField",
          fieldType: "submit",
          label: "  ",
        }).success
      ).toBe(false);
      expect(
        formFieldBlockSchema.safeParse({
          type: "formField",
          fieldType: "submit",
          label: "Send",
        }).success
      ).toBe(true);
    });

    it("rejects multiple on non-select fields", () => {
      expect(
        formFieldBlockSchema.safeParse({
          type: "formField",
          fieldType: "text",
          multiple: true,
        }).success
      ).toBe(false);
      expect(
        formFieldBlockSchema.safeParse({
          type: "formField",
          fieldType: "hidden",
          multiple: true,
        }).success
      ).toBe(false);
      expect(
        formFieldBlockSchema.safeParse({
          type: "formField",
          fieldType: "select",
          multiple: true,
          options: [{ value: "a", label: "A" }],
        }).success
      ).toBe(true);
    });
  });

  describe("background transition ids", () => {
    const basePage = {
      slug: "phase-0",
      title: "Phase 0",
      definitions: {},
      sectionOrder: [],
    };

    it("requires id on all transition types", () => {
      const timeResult = peblorSchema.safeParse({
        ...basePage,
        transitions: { type: "TIME", from: "a", to: "b", duration: 300 },
      });
      const triggerResult = peblorSchema.safeParse({
        ...basePage,
        transitions: { type: "TRIGGER", from: "a", to: "b", duration: 300 },
      });
      const scrollResult = peblorSchema.safeParse({
        ...basePage,
        transitions: { type: "SCROLL", from: "a", to: "b" },
      });

      expect(timeResult.success).toBe(false);
      expect(triggerResult.success).toBe(false);
      expect(scrollResult.success).toBe(false);
    });

    it("accepts transitions with explicit ids", () => {
      const result = peblorSchema.safeParse({
        ...basePage,
        transitions: [
          { type: "TIME", id: "t-time", from: "a", to: "b", duration: 300 },
          { type: "TRIGGER", id: "t-trigger", from: "a", to: "b", duration: 300 },
          { type: "SCROLL", id: "t-scroll", from: "a", to: "b" },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("page forced theme", () => {
    const basePage = {
      slug: "theme-page",
      title: "Theme Page",
      definitions: {},
      sectionOrder: [],
    };

    it("accepts light and dark forced themes", () => {
      expect(peblorSchema.safeParse({ ...basePage, forcedTheme: "light" }).success).toBe(true);
      expect(peblorSchema.safeParse({ ...basePage, forcedTheme: "dark" }).success).toBe(true);
    });

    it("rejects theme values that are not force modes", () => {
      expect(peblorSchema.safeParse({ ...basePage, forcedTheme: "system" }).success).toBe(false);
      expect(peblorSchema.safeParse({ ...basePage, forcedTheme: "toggle" }).success).toBe(false);
    });
  });

  describe("known page tags", () => {
    const config = knownPageTagsConfigSchema.parse({
      knownTags: {
        brand: ["Alpha"],
        ability: ["Short Documentary"],
      },
    });

    it("accepts tags included in the known tags config", () => {
      expect(
        validateKnownPageTags(
          {
            brand: ["Alpha"],
            ability: ["Short Documentary"],
          },
          config
        )
      ).toEqual([]);
    });

    it("reports unknown tag categories and values", () => {
      expect(
        validateKnownPageTags(
          {
            brand: ["Unknown Brand"],
            topic: ["Color"],
          },
          config
        )
      ).toEqual([
        {
          path: ["tags", "brand", 0],
          message: 'Unknown tag "Unknown Brand" for category "brand". Known tags: Alpha.',
        },
        {
          path: ["tags", "topic"],
          message: 'Unknown tag category "topic". Known categories: brand, ability.',
        },
      ]);
    });

    it("reports listing filter categories that are not configured", () => {
      expect(
        validateKnownFilterCategories(
          {
            categories: [{ key: "topic", label: "Topic" }],
          },
          config
        )
      ).toEqual([
        {
          path: ["filterConfig", "categories", 0, "key"],
          message: 'Unknown filter category "topic". Known categories: brand, ability.',
        },
      ]);
    });
  });

  describe("background video overlay colors", () => {
    it("accepts CSS color functions and token mixes", () => {
      expect(
        bgBlockSchema.safeParse({
          type: "backgroundVideo",
          video: "work/video.webm",
          overlay: "oklch(from var(--pb-secondary) l c h / 0.5)",
        }).success
      ).toBe(true);

      expect(
        bgBlockSchema.safeParse({
          type: "backgroundVideo",
          video: "work/video.webm",
          overlay: "color-mix(in oklab, var(--pb-secondary) 50%, transparent)",
        }).success
      ).toBe(true);
    });

    it("keeps empty overlay strings invalid", () => {
      expect(
        bgBlockSchema.safeParse({
          type: "backgroundVideo",
          video: "work/video.webm",
          overlay: "",
        }).success
      ).toBe(false);
    });
  });

  describe("theme-aware paint strings", () => {
    it("accepts strings and non-empty theme objects", () => {
      expect(themeStringSchema.safeParse("#111111").success).toBe(true);
      expect(themeStringSchema.safeParse({ value: "#222222" }).success).toBe(true);
      expect(themeStringSchema.safeParse({ light: "#ffffff" }).success).toBe(true);
      expect(themeStringSchema.safeParse({ dark: "#000000" }).success).toBe(true);
      expect(themeStringSchema.safeParse({ light: "#ffffff", dark: "#000000" }).success).toBe(true);
    });

    it("rejects empty theme objects and empty strings", () => {
      expect(themeStringSchema.safeParse("").success).toBe(false);
      expect(themeStringSchema.safeParse({}).success).toBe(false);
      expect(themeStringSchema.safeParse({ value: "" }).success).toBe(false);
      expect(themeStringSchema.safeParse({ light: "", dark: "" }).success).toBe(false);
    });

    it("allows themed background overlays and variable fills", () => {
      expect(
        bgBlockSchema.safeParse({
          type: "backgroundVideo",
          video: "work/video.webm",
          overlay: { light: "rgba(255,255,255,0.3)", dark: "rgba(0,0,0,0.4)" },
        }).success
      ).toBe(true);

      expect(
        bgBlockSchema.safeParse({
          type: "backgroundVariable",
          layers: [
            {
              fill: {
                value: "linear-gradient(180deg, var(--pb-surface-root), var(--pb-secondary))",
                dark: "linear-gradient(180deg, #05070c, #172033)",
              },
            },
          ],
        }).success
      ).toBe(true);
    });
  });

  describe("compat-first enum hardening", () => {
    it("rejects invalid section cursor strings (SCHEMA-3)", () => {
      const result = sectionContentBlockSchema.safeParse({
        type: "contentBlock",
        gap: "0",
        elements: [],
        cursor: "made-up-cursor-value",
      });
      expect(result.success).toBe(false);
    });

    it("normalizes unknown revealPreset to undefined", () => {
      const result = sectionRevealSchema.safeParse({
        type: "revealSection",
        revealPreset: "not-a-real-preset",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.revealPreset).toBeUndefined();
      }
    });
  });

  describe("page scroll config", () => {
    it("accepts snapType values", () => {
      expect(pageScrollConfigSchema.safeParse({ snapType: "y mandatory" }).success).toBe(true);
      expect(pageScrollConfigSchema.safeParse({ snapType: "none" }).success).toBe(true);
    });
  });

  describe("PR 2 — schema negative fixtures", () => {
    describe("cross-reference: missing sectionOrder key", () => {
      it("fails when sectionOrder references a missing definition", () => {
        const result = validatePageReferences({
          sectionOrder: ["missing"],
          definitions: {},
        });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors.some((e) => e.includes("sectionOrder"))).toBe(true);
        }
      });
    });

    describe("cross-reference: missing bgKey", () => {
      it("fails when bgKey does not match any definition", () => {
        const result = validatePageReferences({
          bgKey: "missingBg",
          definitions: {},
        });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors.some((e) => e.includes("bgKey"))).toBe(true);
        }
      });
    });

    describe("cross-reference: missing trigger key", () => {
      it("fails when triggers reference a missing definition", () => {
        const result = validatePageReferences({
          triggers: ["missingTrigger"],
          definitions: {},
        });
        expect(result.valid).toBe(false);
      });
    });

    describe("elementOrder {} validation", () => {
      it("rejects empty elementOrder object", () => {
        // sectionColumnDefinitionSchema requires at least one breakpoint
        const result = peblorSchema.safeParse({
          title: "Test",
          sectionOrder: [],
          definitions: {
            col: {
              type: "sectionColumn",
              elementOrder: {},
              columns: 1,
              columnAssignments: { a: 0 },
            },
          },
        });
        expect(result.success).toBe(false);
      });
    });

    describe("button actionPayload validation", () => {
      it("rejects navigate action without payload", () => {
        const result = elementButtonSchema.safeParse({
          type: "elementButton",
          action: "navigate",
        });
        expect(result.success).toBe(false);
      });

      it("rejects navigate with wrong payload shape", () => {
        const result = elementButtonSchema.safeParse({
          type: "elementButton",
          action: "navigate",
          actionPayload: { wrong: "field" },
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          const payloadIssues = result.error.issues.filter((i) => i.path[0] === "actionPayload");
          expect(payloadIssues.length).toBeGreaterThan(0);
        }
      });

      it("accepts navigate with valid href payload", () => {
        const result = elementButtonSchema.safeParse({
          type: "elementButton",
          action: "navigate",
          actionPayload: { href: "/work" },
        });
        expect(result.success).toBe(true);
      });
    });

    describe("form action as handler key only", () => {
      it("rejects form action as URL string", () => {
        const result = sectionFormBlockSchema.safeParse({
          type: "formBlock",
          action: "/api/forms/contact",
          fields: [],
        });
        expect(result.success).toBe(false);
      });

      it("accepts form action as handler key", () => {
        const result = sectionFormBlockSchema.safeParse({
          type: "formBlock",
          action: "contact",
          fields: [],
        });
        expect(result.success).toBe(true);
      });

      it("rejects unknown handler key", () => {
        const result = sectionFormBlockSchema.safeParse({
          type: "formBlock",
          action: "unknownHandler",
          fields: [],
        });
        expect(result.success).toBe(false);
      });
    });

    describe("visibility field validation", () => {
      it("accepts valid visibility values", () => {
        const r1 = peblorSchema.safeParse({
          title: "Test",
          visibility: "public",
          sectionOrder: [],
          definitions: {},
        });
        expect(r1.success).toBe(true);

        const r2 = peblorSchema.safeParse({
          title: "Test",
          visibility: "protected",
          sectionOrder: [],
          definitions: {},
        });
        expect(r2.success).toBe(true);

        const r3 = peblorSchema.safeParse({
          title: "Test",
          visibility: "unlisted",
          sectionOrder: [],
          definitions: {},
        });
        expect(r3.success).toBe(true);
      });

      it("rejects invalid visibility value", () => {
        const result = peblorSchema.safeParse({
          title: "Test",
          visibility: "invalid",
          sectionOrder: [],
          definitions: {},
        });
        expect(result.success).toBe(false);
      });
    });

    describe("condition block fail-closed", () => {
      it("evaluates {} as false", () => {
        expect(evaluateConditions({}, {})).toBe(false);
      });

      it("evaluates { conditions: [] } as false", () => {
        expect(evaluateConditions({ conditions: [] }, {})).toBe(false);
      });
    });
  });
});

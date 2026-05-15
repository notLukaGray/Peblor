import { describe, expect, it } from "vitest";
import { autoPromotePresetsInSection } from "./auto-presets";
import type { ConversionContext, ExportResult } from "../types/figma-plugin";

function makeResult(): ExportResult {
  return {
    pages: {},
    presets: {},
    modals: {},
    modules: {},
    globals: {},
    assets: [],
    warnings: [],
    elementCount: 0,
  };
}

function makeCtx(autoPresets = true): ConversionContext {
  return {
    assets: [],
    warnings: [],
    autoPresets,
    usedPresetKeys: new Set<string>(),
    assetCounter: 0,
    usedIds: new Set<string>(),
    usedAssetKeys: new Set<string>(),
    cdnPrefix: "",
  };
}

describe("auto preset promotion", () => {
  it("promotes repeated definition blocks when only nested definition keys differ", () => {
    const section: Record<string, unknown> = {
      elementOrder: ["buttondark", "buttondark-2"],
      definitions: {
        buttondark: {
          type: "elementGroup",
          id: "buttondark",
          interactions: {
            onClick: {
              type: "navigate",
              payload: { href: "https://example.com" },
            },
            cursor: "pointer",
          },
          section: {
            elementOrder: ["buttondark--default"],
            definitions: {
              "buttondark--default": {
                type: "elementGroup",
                id: "buttondark--default",
                section: {
                  elementOrder: ["internalframe"],
                  definitions: {
                    internalframe: {
                      type: "elementGroup",
                      id: "internalframe",
                      section: {
                        elementOrder: ["text"],
                        definitions: {
                          text: { type: "elementBody", id: "text", text: "BUTTON" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "buttondark-2": {
          type: "elementGroup",
          id: "buttondark-2",
          interactions: {
            onClick: {
              type: "navigate",
              payload: { href: "https://example.com" },
            },
            cursor: "pointer",
          },
          section: {
            elementOrder: ["buttondark-2--default"],
            definitions: {
              "buttondark-2--default": {
                type: "elementGroup",
                id: "buttondark-2--default",
                section: {
                  elementOrder: ["internalframe-2"],
                  definitions: {
                    "internalframe-2": {
                      type: "elementGroup",
                      id: "internalframe-2",
                      section: {
                        elementOrder: ["text-2"],
                        definitions: {
                          "text-2": { type: "elementBody", id: "text-2", text: "BUTTON" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const result = makeResult();
    const ctx = makeCtx(true);
    autoPromotePresetsInSection(section, result, ctx);

    expect(Object.keys(result.presets)).toEqual(["buttondark"]);
    const updated = ((section.definitions as Record<string, unknown>) ?? {}) as Record<
      string,
      unknown
    >;
    expect(updated.buttondark).toEqual({
      preset: "buttondark",
      id: "buttondark",
    });
    expect(updated["buttondark-2"]).toEqual({
      preset: "buttondark",
      id: "buttondark-2",
    });
  });
});

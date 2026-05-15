import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildExportZip } from "./ui-zip";

describe("export zip packaging", () => {
  it("includes export-trace.json when a trace is present", async () => {
    const blob = await buildExportZip(
      {
        pages: {},
        presets: {},
        modals: {},
        modules: {},
        globals: {},
        assets: [],
        warnings: [],
        trace: {
          counts: {
            severity: { error: 0, warn: 1, info: 0 },
            category: { preflight: 1 },
          },
          frames: [],
        },
        elementCount: 0,
      },
      [],
      0,
      0
    );

    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(zip.file("export-trace.json")).toBeTruthy();

    const traceJson = await zip.file("export-trace.json")!.async("string");
    expect(JSON.parse(traceJson)).toEqual({
      counts: {
        severity: { error: 0, warn: 1, info: 0 },
        category: { preflight: 1 },
      },
      frames: [],
    });
  });

  it("omits export-trace.json when trace is absent", async () => {
    const blob = await buildExportZip(
      {
        pages: {},
        presets: {},
        modals: {},
        modules: {},
        globals: { buttons: {}, backgrounds: {}, elements: {} },
        assets: [],
        warnings: [],
        elementCount: 0,
      },
      [],
      0,
      0
    );
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(zip.file("export-trace.json")).toBeNull();
    expect(zip.file("globals.json")).toBeNull();
  });

  it("skips unsafe split-content paths while keeping canonical page export", async () => {
    const blob = await buildExportZip(
      {
        pages: {
          "../unsafe": { sectionOrder: ["hero"], definitions: { hero: { type: "contentBlock" } } },
        },
        presets: {},
        modals: {},
        modules: {},
        globals: { buttons: {}, backgrounds: {}, elements: {} },
        assets: [],
        warnings: [],
        elementCount: 0,
      },
      [],
      0,
      0
    );
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const pagePaths = Object.keys(zip.files).filter((f) => f.startsWith("pages/"));
    expect(pagePaths.length).toBe(1);
    expect(pagePaths[0]).toBeTruthy();
    expect(zip.file("content/pages/../unsafe/index.json")).toBeNull();
  });
});

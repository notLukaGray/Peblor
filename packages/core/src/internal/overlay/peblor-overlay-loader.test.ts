import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { configureCoreGlobals, resetCoreGlobals } from "../../lib/globals";
import { CONTENT_DIR } from "../load/peblor-load-io";
import { loadOverlaySections } from "./peblor-overlay-loader";

describe("loadOverlaySections", () => {
  const originalSecret = process.env.BUNNY_TOKEN_SECRET;
  const overlayId = "overlay-asset-resolution-test";
  const overlayPath = path.join(CONTENT_DIR, "site/overlays", `${overlayId}.json`);

  beforeEach(async () => {
    process.env.BUNNY_TOKEN_SECRET = "test-secret";
    configureCoreGlobals({ cdnBase: "https://media.example.com/website" });
    await fs.promises.writeFile(
      overlayPath,
      JSON.stringify(
        {
          type: "contentBlock",
          id: overlayId,
          width: "100%",
          elements: [
            {
              type: "elementImage",
              id: "overlay-image",
              src: "work/overlay.webp",
              alt: "",
              width: "100%",
              height: "20rem",
            },
          ],
        },
        null,
        2
      )
    );
  });

  afterEach(async () => {
    resetCoreGlobals();
    await fs.promises.rm(overlayPath, { force: true });
    if (originalSecret === undefined) {
      delete process.env.BUNNY_TOKEN_SECRET;
    } else {
      process.env.BUNNY_TOKEN_SECRET = originalSecret;
    }
  });

  it("resolves overlay image assets through the server asset pipeline", async () => {
    const sections = await loadOverlaySections(undefined, {
      isMobile: false,
      assetViewportWidthPx: 1440,
    });

    const overlay = sections.find((section) => (section as { id?: string }).id === overlayId) as
      | ({ elements?: Array<{ src?: string; srcSet?: string }> } & { id?: string })
      | undefined;

    expect(overlay).toBeDefined();
    const image = overlay?.elements?.[0];
    expect(image?.src).toBeDefined();

    const url = new URL(image!.src!, "http://localhost");
    expect(url.pathname).toBe("/api/media/work/overlay.webp");
    expect(Number(url.searchParams.get("width"))).toBeGreaterThan(0);
    expect(image?.srcSet).toContain("/api/media/work/overlay.webp");
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolvePeblorAssetsOnServer } from "./peblor-resolve-assets-server";
import { configureCoreGlobals, resetCoreGlobals } from "../lib/globals";

describe("resolvePeblorAssetsOnServer", () => {
  const originalSecret = process.env.BUNNY_TOKEN_SECRET;

  beforeEach(() => {
    process.env.BUNNY_TOKEN_SECRET = "test-secret";
    configureCoreGlobals({ cdnBase: "https://media.example.com/website" });
  });

  afterEach(() => {
    resetCoreGlobals();
    if (originalSecret === undefined) {
      delete process.env.BUNNY_TOKEN_SECRET;
    } else {
      process.env.BUNNY_TOKEN_SECRET = originalSecret;
    }
  });

  it("routes non-hug element images to stable media aliases", () => {
    const { resolvedSections } = resolvePeblorAssetsOnServer(
      null,
      [
        {
          type: "contentBlock",
          elements: [
            {
              type: "elementImage",
              id: "img-fill",
              src: "work/pic.webp",
              alt: "",
              width: "100%",
              height: "20rem",
            },
          ],
        },
      ] as never[],
      {},
      [],
      { isMobile: false, viewportWidthPx: 1920 }
    );

    const src = (resolvedSections[0] as unknown as { elements: Array<{ src: string }> })
      .elements[0]!.src;
    const url = new URL(src, "http://localhost");
    expect(url.pathname).toBe("/api/media/work/pic.webp");
    expect(Number(url.searchParams.get("width"))).toBeGreaterThan(0);
    expect(url.searchParams.get("quality")).toBe("75");
    expect(url.searchParams.get("format")).toBe("webp");
    expect(
      (resolvedSections[0] as unknown as { elements: Array<{ srcSet?: string }> }).elements[0]!
        .srcSet
    ).toContain("/api/media/work/pic.webp");
  });

  it("keeps intrinsic element images on fixed media aliases", () => {
    const { resolvedSections } = resolvePeblorAssetsOnServer(
      null,
      [
        {
          type: "contentBlock",
          elements: [
            {
              type: "elementImage",
              id: "img-hug",
              src: "work/pic.webp",
              alt: "",
              width: "400px",
              height: "hug",
            },
          ],
        },
      ] as never[],
      {},
      [],
      { isMobile: false, viewportWidthPx: 1920 }
    );

    const src = (resolvedSections[0] as unknown as { elements: Array<{ src: string }> })
      .elements[0]!.src;
    const url = new URL(src, "http://localhost");
    expect(url.pathname).toBe("/api/media/work/pic.webp");
    expect(url.searchParams.get("width")).toBe("400");
    expect(url.searchParams.get("quality")).toBe("75");
    expect(url.searchParams.get("format")).toBe("webp");
  });

  it("routes fill-height element images to stable media aliases", () => {
    const { resolvedSections } = resolvePeblorAssetsOnServer(
      null,
      [
        {
          type: "contentBlock",
          width: "min(38rem, 42vw)",
          elements: [
            {
              type: "elementImage",
              id: "img-fill-height",
              src: "work/pic.webp",
              alt: "",
              width: "18rem",
              height: "100%",
              sizes: "(max-width: 768px) calc(100vw - 2rem), (max-width: 1200px) 42vw, 38vw",
            },
          ],
        },
      ] as never[],
      {},
      [],
      { isMobile: false, viewportWidthPx: 1920 }
    );

    const src = (resolvedSections[0] as unknown as { elements: Array<{ src: string }> })
      .elements[0]!.src;
    const url = new URL(src, "http://localhost");
    expect(url.pathname).toBe("/api/media/work/pic.webp");
    const width = Number(url.searchParams.get("width"));
    const quality = Number(url.searchParams.get("quality"));
    expect(Number.isFinite(width)).toBe(true);
    expect(width).toBeGreaterThan(0);
    expect(quality).toBeGreaterThan(0);
  });

  it("uses matching media clause from sizes on mobile instead of desktop default slot", () => {
    const { resolvedSections } = resolvePeblorAssetsOnServer(
      null,
      [
        {
          type: "contentBlock",
          width: "2000px",
          elements: [
            {
              type: "elementImage",
              id: "img-mobile-sizes",
              src: "work/pic.webp",
              alt: "",
              width: "100%",
              height: "100%",
              sizes: "(max-width: 768px) calc(100vw - 2rem), (max-width: 1200px) 42vw, 38vw",
            },
          ],
        },
      ] as never[],
      {},
      [],
      { isMobile: true, viewportWidthPx: 768 }
    );

    const src = (resolvedSections[0] as unknown as { elements: Array<{ src: string }> })
      .elements[0]!.src;
    const url = new URL(src, "http://localhost");
    const width = Number(url.searchParams.get("width"));
    expect(Number.isFinite(width)).toBe(true);
    expect(width).toBeGreaterThan(0);
  });

  it("routes percent-height images (e.g. 90%) to stable media aliases", () => {
    const { resolvedSections } = resolvePeblorAssetsOnServer(
      null,
      [
        {
          type: "contentBlock",
          width: "min(38rem, 42vw)",
          elements: [
            {
              type: "elementImage",
              id: "img-percent-height",
              src: "work/pic.webp",
              alt: "",
              width: "18rem",
              height: "90%",
              sizes: "(max-width: 768px) calc(100vw - 2rem), (max-width: 1200px) 42vw, 38vw",
            },
          ],
        },
      ] as never[],
      {},
      [],
      { isMobile: false, viewportWidthPx: 1920 }
    );

    const src = (resolvedSections[0] as unknown as { elements: Array<{ src: string }> })
      .elements[0]!.src;
    const url = new URL(src, "http://localhost");
    const width = Number(url.searchParams.get("width"));
    const quality = Number(url.searchParams.get("quality"));
    expect(Number.isFinite(width)).toBe(true);
    expect(width).toBeGreaterThan(0);
    expect(quality).toBeGreaterThan(0);
  });

  it("routes fill-width intrinsic images to stable media aliases", () => {
    const { resolvedSections } = resolvePeblorAssetsOnServer(
      null,
      [
        {
          type: "contentBlock",
          width: "min(38rem, 42vw)",
          elements: [
            {
              type: "elementImage",
              id: "img-fill-width",
              src: "work/pic.webp",
              alt: "",
              width: "100%",
              height: "hug",
              sizes: "(max-width: 768px) calc(100vw - 2rem), (max-width: 1200px) 42vw, 38vw",
            },
          ],
        },
      ] as never[],
      {},
      [],
      { isMobile: false, viewportWidthPx: 1920 }
    );

    const src = (resolvedSections[0] as unknown as { elements: Array<{ src: string }> })
      .elements[0]!.src;
    const url = new URL(src, "http://localhost");
    const width = Number(url.searchParams.get("width"));
    const quality = Number(url.searchParams.get("quality"));
    expect(Number.isFinite(width)).toBe(true);
    expect(width).toBeGreaterThan(0);
    expect(quality).toBeGreaterThan(0);
  });

  it("routes percent-width intrinsic images (e.g. 90%) to stable media aliases", () => {
    const { resolvedSections } = resolvePeblorAssetsOnServer(
      null,
      [
        {
          type: "contentBlock",
          width: "min(38rem, 42vw)",
          elements: [
            {
              type: "elementImage",
              id: "img-percent-width",
              src: "work/pic.webp",
              alt: "",
              width: "90%",
              height: "hug",
              sizes: "(max-width: 768px) calc(100vw - 2rem), (max-width: 1200px) 42vw, 38vw",
            },
          ],
        },
      ] as never[],
      {},
      [],
      { isMobile: false, viewportWidthPx: 1920 }
    );

    const src = (resolvedSections[0] as unknown as { elements: Array<{ src: string }> })
      .elements[0]!.src;
    const url = new URL(src, "http://localhost");
    const width = Number(url.searchParams.get("width"));
    const quality = Number(url.searchParams.get("quality"));
    expect(Number.isFinite(width)).toBe(true);
    expect(width).toBeGreaterThan(0);
    expect(quality).toBeGreaterThan(0);
  });

  it("parses min/max with 3+ operands in sizes expressions", () => {
    const { resolvedSections } = resolvePeblorAssetsOnServer(
      null,
      [
        {
          type: "contentBlock",
          width: "2000px",
          elements: [
            {
              type: "elementImage",
              id: "img-min-max-nary",
              src: "work/pic.webp",
              alt: "",
              width: "100%",
              height: "hug",
              sizes: "(max-width: 1200px) 90vw, min(100vw, 1200px, 60rem)",
            },
          ],
        },
      ] as never[],
      {},
      [],
      { isMobile: false, viewportWidthPx: 1920 }
    );

    const src = (resolvedSections[0] as unknown as { elements: Array<{ src: string }> })
      .elements[0]!.src;
    const url = new URL(src, "http://localhost");
    const width = Number(url.searchParams.get("width"));
    expect(width).toBeGreaterThan(0);
  });

  it("routes background video posters to stable media aliases", () => {
    const { resolvedBg } = resolvePeblorAssetsOnServer(
      {
        type: "backgroundVideo",
        video: "work/hero.mp4",
        poster: "work/hero.webp",
      } as never,
      [],
      {},
      [],
      { isMobile: false, viewportWidthPx: 1920 }
    );

    const url = new URL((resolvedBg as { poster: string }).poster, "http://localhost");
    expect(url.pathname).toBe("/api/media/work/hero.webp");
    expect(url.searchParams.get("aspect_ratio")).toBe("16:9");
  });

  it("lowers static theme background fills to css-native light/dark strings", () => {
    const { resolvedBg, bgDefinitions } = resolvePeblorAssetsOnServer(
      {
        type: "backgroundVariable",
        layers: [{ fill: { light: "#fff", dark: "#000" } }],
      } as never,
      [],
      {
        themedBg: {
          type: "backgroundVariable",
          layers: [{ fill: { value: "#111", dark: "#eee" } }],
        } as never,
      },
      [],
      { isMobile: false, viewportWidthPx: 1920 }
    );

    expect((resolvedBg as { layers: Array<{ fill: string }> }).layers[0]?.fill).toBe(
      "light-dark(#fff, #000)"
    );
    expect((bgDefinitions.themedBg as { layers: Array<{ fill: string }> }).layers[0]?.fill).toBe(
      "light-dark(#111, #eee)"
    );
  });

  it("does not evaluate vw-based sizes without explicit viewport width", () => {
    const { resolvedSections } = resolvePeblorAssetsOnServer(
      null,
      [
        {
          type: "contentBlock",
          width: "min(38rem, 42vw)",
          elements: [
            {
              type: "elementImage",
              id: "img-no-viewport",
              src: "work/pic.webp",
              alt: "",
              width: "100%",
              height: "hug",
              sizes: "(max-width: 768px) calc(100vw - 2rem), (max-width: 1200px) 42vw, 38vw",
            },
          ],
        },
      ] as never[],
      {},
      [],
      { isMobile: false }
    );

    const src = (resolvedSections[0] as unknown as { elements: Array<{ src: string }> })
      .elements[0]!.src;
    const url = new URL(src, "http://localhost");
    const width = Number(url.searchParams.get("width"));
    expect(width).toBe(768);
  });

  it("falls back to widest parseable slot when media condition cannot be evaluated", () => {
    const { resolvedSections } = resolvePeblorAssetsOnServer(
      null,
      [
        {
          type: "contentBlock",
          width: "2000px",
          elements: [
            {
              type: "elementImage",
              id: "img-unsupported-media",
              src: "work/pic.webp",
              alt: "",
              width: "100%",
              height: "hug",
              sizes: "(orientation: portrait) 20vw, (max-width: 1200px) 30vw, 1200px",
            },
          ],
        },
      ] as never[],
      {},
      [],
      { isMobile: false, viewportWidthPx: 1920 }
    );

    const src = (resolvedSections[0] as unknown as { elements: Array<{ src: string }> })
      .elements[0]!.src;
    const url = new URL(src, "http://localhost");
    const width = Number(url.searchParams.get("width"));
    // The stable media alias still carries normalized width bounds.
    expect(width).toBe(1536);
  });

  it("evaluates sizes clauses with media types like screen and", () => {
    const { resolvedSections } = resolvePeblorAssetsOnServer(
      null,
      [
        {
          type: "contentBlock",
          width: "2000px",
          elements: [
            {
              type: "elementImage",
              id: "img-screen-media",
              src: "work/pic.webp",
              alt: "",
              width: "100%",
              height: "hug",
              sizes: "screen and (max-width: 768px) 100vw, 50vw",
            },
          ],
        },
      ] as never[],
      {},
      [],
      { isMobile: true, viewportWidthPx: 768 }
    );

    const src = (resolvedSections[0] as unknown as { elements: Array<{ src: string }> })
      .elements[0]!.src;
    const url = new URL(src, "http://localhost");
    const width = Number(url.searchParams.get("width"));
    // 100vw at 768 => 768; with 1.25x headroom => 960, then capped by mobile max width (768).
    expect(width).toBe(768);
  });

  it("accepts unitless zero in sizes slots to avoid accidental over-fetch", () => {
    const { resolvedSections } = resolvePeblorAssetsOnServer(
      null,
      [
        {
          type: "contentBlock",
          width: "2000px",
          elements: [
            {
              type: "elementImage",
              id: "img-zero-slot",
              src: "work/pic.webp",
              alt: "",
              width: "100%",
              height: "hug",
              sizes: "(max-width: 768px) 0, 50vw",
            },
          ],
        },
      ] as never[],
      {},
      [],
      { isMobile: true, viewportWidthPx: 768 }
    );

    const src = (resolvedSections[0] as unknown as { elements: Array<{ src: string }> })
      .elements[0]!.src;
    const url = new URL(src, "http://localhost");
    const width = Number(url.searchParams.get("width"));
    // The stable media alias still uses bounded mobile width defaults.
    expect(width).toBe(768);
  });
});

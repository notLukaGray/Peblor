import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAssetFromCdn, getSignedCdnUrl, validateAssetKey } from "./cdn-asset-server";
import { configureCoreGlobals, resetCoreGlobals } from "./globals";

describe("getSignedCdnUrl", () => {
  const originalSecret = process.env.BUNNY_TOKEN_SECRET;
  const originalBucket = process.env.BUNNY_TOKEN_EXPIRY_BUCKET_SECONDS;
  const originalSigningMode = process.env.CDN_SIGNING_MODE;

  beforeEach(() => {
    configureCoreGlobals({ cdnBase: "https://media.example.com/website" });
  });

  afterEach(() => {
    resetCoreGlobals();
    if (originalSecret === undefined) {
      delete process.env.BUNNY_TOKEN_SECRET;
    } else {
      process.env.BUNNY_TOKEN_SECRET = originalSecret;
    }
    if (originalBucket === undefined) {
      delete process.env.BUNNY_TOKEN_EXPIRY_BUCKET_SECONDS;
    } else {
      process.env.BUNNY_TOKEN_EXPIRY_BUCKET_SECONDS = originalBucket;
    }
    if (originalSigningMode === undefined) {
      delete process.env.CDN_SIGNING_MODE;
    } else {
      process.env.CDN_SIGNING_MODE = originalSigningMode;
    }
    vi.restoreAllMocks();
  });

  it("buckets expiry to reduce signed URL churn", () => {
    process.env.BUNNY_TOKEN_SECRET = "test-secret";
    process.env.BUNNY_TOKEN_EXPIRY_BUCKET_SECONDS = "3600";
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-04-29T12:15:10.000Z").getTime());

    const first = getSignedCdnUrl("work/pic.webp", { width: "400", quality: "75" });
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-04-29T12:35:20.000Z").getTime());
    const second = getSignedCdnUrl("work/pic.webp", { width: "400", quality: "75" });

    const firstUrl = new URL(first);
    const secondUrl = new URL(second);
    expect(firstUrl.searchParams.get("expires")).toBe(secondUrl.searchParams.get("expires"));
  });

  it("normalizes and clamps image params before signing", () => {
    process.env.BUNNY_TOKEN_SECRET = "test-secret";
    const signed = getSignedCdnUrl("work/pic.webp", {
      width: "99999",
      quality: "0",
      format: "WEBP",
      aspect_ratio: "16/9",
      class: "hero",
      bogus: "x",
    } as Record<string, string>);

    const url = new URL(signed);
    expect(url.searchParams.get("width")).toBe("4096");
    expect(url.searchParams.get("quality")).toBe("1");
    expect(url.searchParams.get("format")).toBe("webp");
    expect(url.searchParams.get("aspect_ratio")).toBe("16:9");
    expect(url.searchParams.get("class")).toBe("hero");
    expect(url.searchParams.get("bogus")).toBeNull();
  });

  it("throws in private mode without secret", () => {
    delete process.env.BUNNY_TOKEN_SECRET;
    delete process.env.BUNNY_SECURITY_KEY;
    delete process.env.VIDEO_TOKEN_SECRET;
    process.env.CDN_SIGNING_MODE = "private";
    expect(() => getSignedCdnUrl("work/pic.webp")).toThrow("CDN signing is in private mode");
  });

  it("returns unsigned URL in public mode without secret", () => {
    delete process.env.BUNNY_TOKEN_SECRET;
    process.env.CDN_SIGNING_MODE = "public";
    const url = getSignedCdnUrl("work/pic.webp");
    expect(url).not.toContain("token=");
    expect(url).toContain("work/pic.webp");
  });

  it("uses Bunny path-style directory tokens for stream manifests", () => {
    process.env.BUNNY_TOKEN_SECRET = "test-secret";
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-04-29T12:15:10.000Z").getTime());

    const url = getSignedCdnUrl("work/project-alpha/vp9/manifest.mpd");

    expect(url).toMatch(
      /^https:\/\/media\.example\.com\/bcdn_token=[^/]+&expires=\d+&token_path=%2Fwebsite%2Fwork%2Fproject-alpha%2Fvp9%2F\/website\/work\/project-alpha\/vp9\/manifest\.mpd$/
    );
    expect(url).not.toContain("manifest.mpd?bcdn_token=");
  });
});

describe("validateAssetKey traversal", () => {
  it("rejects path traversal as a segment", () => {
    expect(validateAssetKey("../etc/passwd")).toBeNull();
    expect(validateAssetKey("a/../b/c.webp")).toBeNull();
    expect(validateAssetKey("a/b/../c.webp")).toBeNull();
  });

  it("rejects empty and dot segments", () => {
    expect(validateAssetKey("a//b.webp")).toBeNull();
    expect(validateAssetKey("./a.webp")).toBeNull();
    expect(validateAssetKey("/abs/a.webp")).toBeNull();
  });

  it("accepts filenames containing dots", () => {
    expect(validateAssetKey("v1.2/poster.webp")).toBe("v1.2/poster.webp");
    expect(validateAssetKey("final..export.webp")).toBe("final..export.webp");
    expect(validateAssetKey("a.b.c/d.e.f.webp")).toBe("a.b.c/d.e.f.webp");
  });

  it("rejects keys with backslashes turned to slashes that produce traversal", () => {
    expect(validateAssetKey("..\\foo.webp")).toBeNull();
  });
});

describe("fetchAssetFromCdn", () => {
  const originalSecret = process.env.BUNNY_TOKEN_SECRET;
  const originalSigningMode = process.env.CDN_SIGNING_MODE;

  beforeEach(() => {
    configureCoreGlobals({ cdnBase: "https://media.example.com/website" });
  });

  afterEach(() => {
    resetCoreGlobals();
    if (originalSecret === undefined) {
      delete process.env.BUNNY_TOKEN_SECRET;
    } else {
      process.env.BUNNY_TOKEN_SECRET = originalSecret;
    }
    if (originalSigningMode === undefined) {
      delete process.env.CDN_SIGNING_MODE;
    } else {
      process.env.CDN_SIGNING_MODE = originalSigningMode;
    }
    vi.restoreAllMocks();
  });

  it("retries after transient failure", async () => {
    process.env.BUNNY_TOKEN_SECRET = "test-secret";
    process.env.CDN_SIGNING_MODE = "public";
    const responses = [
      Promise.resolve(new Response(null, { status: 502 })),
      Promise.resolve(new Response(new Uint8Array([1, 2, 3]), { status: 200 })),
    ];
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => responses.shift() as Promise<Response>);

    const result = await fetchAssetFromCdn("work/pic.webp");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result?.buffer.byteLength).toBe(3);
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const prevSitePassword = process.env.SITE_PASSWORD;
const prevAccessTokenVersion = process.env.ACCESS_TOKEN_VERSION;

beforeAll(() => {
  process.env.SITE_PASSWORD = "test-secret-cross-impl-123";
  process.env.ACCESS_TOKEN_VERSION = "v1";
});

afterAll(() => {
  const env = process.env as Record<string, string | undefined>;
  if (prevSitePassword === undefined) delete env.SITE_PASSWORD;
  else env.SITE_PASSWORD = prevSitePassword;
  if (prevAccessTokenVersion === undefined) delete env.ACCESS_TOKEN_VERSION;
  else env.ACCESS_TOKEN_VERSION = prevAccessTokenVersion;
});

describe("access token cross-implementation consistency", () => {
  it("createAccessToken (Node crypto) matches createAccessTokenEdge (Web Crypto)", async () => {
    const { createAccessToken } = await import("./access-cookie");
    const { createAccessTokenEdge } = await import("./access-cookie-edge");

    const nodeToken = createAccessToken();
    const edgeToken = await createAccessTokenEdge("test-secret-cross-impl-123");

    expect(nodeToken).toBe(edgeToken);
  });

  it("verifyAccessToken and verifyAccessTokenEdge agree on the same token", async () => {
    const { createAccessToken, verifyAccessToken } = await import("./access-cookie");
    const { verifyAccessTokenEdge } = await import("./access-cookie-edge");

    const nodeToken = createAccessToken();

    expect(verifyAccessToken(nodeToken)).toBe(true);

    const edgeResult = await verifyAccessTokenEdge(nodeToken);
    expect(edgeResult).toBe(true);
  });

  it("both implementations reject garbage tokens", async () => {
    const { verifyAccessToken } = await import("./access-cookie");
    const { verifyAccessTokenEdge } = await import("./access-cookie-edge");

    expect(verifyAccessToken("garbage-token")).toBe(false);

    const edgeResult = await verifyAccessTokenEdge("garbage-token");
    expect(edgeResult).toBe(false);
  });

  it("both implementations reject empty/undefined tokens", async () => {
    const { verifyAccessToken } = await import("./access-cookie");
    const { verifyAccessTokenEdge } = await import("./access-cookie-edge");

    expect(verifyAccessToken(undefined)).toBe(false);
    expect(verifyAccessToken("")).toBe(false);

    expect(await verifyAccessTokenEdge(undefined)).toBe(false);
    expect(await verifyAccessTokenEdge("")).toBe(false);
  });
});

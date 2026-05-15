import { afterEach, describe, expect, it } from "vitest";
import { createAccessTokenEdge } from "./access-cookie-edge";

const originalNodeEnv = process.env.NODE_ENV;
const originalAccessTokenVersion = process.env.ACCESS_TOKEN_VERSION;
const env = process.env as Record<string, string | undefined>;

afterEach(() => {
  env.NODE_ENV = originalNodeEnv;
  if (originalAccessTokenVersion === undefined) {
    delete process.env.ACCESS_TOKEN_VERSION;
  } else {
    process.env.ACCESS_TOKEN_VERSION = originalAccessTokenVersion;
  }
});

describe("createAccessTokenEdge", () => {
  it("falls back to local deploy id when ACCESS_TOKEN_VERSION is unset", async () => {
    env.NODE_ENV = "production";
    delete process.env.ACCESS_TOKEN_VERSION;

    await expect(createAccessTokenEdge("test-secret")).resolves.toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

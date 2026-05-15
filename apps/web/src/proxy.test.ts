import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { accessCookieName } from "@/core/lib/auth-constants";

vi.mock("@/core/lib/protected-slugs.generated", () => ({
  PROTECTED_PAGE_PATHS: new Set<string>(["protected/secret", "research/secret-case"]),
}));

const verifyAccessTokenEdge = vi.fn<() => Promise<boolean>>();
vi.mock("@/core/lib/access-cookie-edge", () => ({
  verifyAccessTokenEdge,
}));

describe("proxy", () => {
  let priorSitePassword: string | undefined;

  beforeEach(() => {
    priorSitePassword = process.env.SITE_PASSWORD;
  });

  afterEach(() => {
    const env = process.env as Record<string, string | undefined>;
    if (priorSitePassword === undefined) delete env.SITE_PASSWORD;
    else env.SITE_PASSWORD = priorSitePassword;
  });

  it("passes through when SITE_PASSWORD is not configured", async () => {
    delete process.env.SITE_PASSWORD;
    verifyAccessTokenEdge.mockClear();
    const { proxy } = await import("./proxy");
    const req = new NextRequest("https://example.com/research/secret-case");
    const res = await proxy(req);
    expect(res.status).toBe(200);
    expect(verifyAccessTokenEdge).not.toHaveBeenCalled();
  });

  it("redirects protected path to unlock route when cookie invalid", async () => {
    process.env.SITE_PASSWORD = "secret";
    verifyAccessTokenEdge.mockResolvedValue(false);
    const { proxy } = await import("./proxy");
    const req = new NextRequest("https://example.com/research/secret-case");
    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain(
      "/unlock?unlock_redirect=%2Fresearch%2Fsecret-case"
    );
  });

  it("passes through protected path when cookie is valid", async () => {
    process.env.SITE_PASSWORD = "secret";
    verifyAccessTokenEdge.mockClear();
    verifyAccessTokenEdge.mockResolvedValue(true);
    const { proxy } = await import("./proxy");
    const req = new NextRequest("https://example.com/research/secret-case");
    req.cookies.set(accessCookieName, "valid-token");
    const res = await proxy(req);
    expect(res.status).toBe(200);
    expect(verifyAccessTokenEdge).toHaveBeenCalledTimes(1);
    expect(verifyAccessTokenEdge).toHaveBeenCalledWith("valid-token");
  });

  it("passes through unprotected path without token verification", async () => {
    process.env.SITE_PASSWORD = "secret";
    verifyAccessTokenEdge.mockClear();
    const { proxy } = await import("./proxy");
    const req = new NextRequest("https://example.com/work/public-page");
    const res = await proxy(req);
    expect(res.status).toBe(200);
    expect(verifyAccessTokenEdge).not.toHaveBeenCalled();
  });

  it("passes through root path without token verification", async () => {
    process.env.SITE_PASSWORD = "secret";
    verifyAccessTokenEdge.mockClear();
    const { proxy } = await import("./proxy");
    const req = new NextRequest("https://example.com/");
    const res = await proxy(req);
    expect(res.status).toBe(200);
    expect(verifyAccessTokenEdge).not.toHaveBeenCalled();
  });

  it("normalizes trailing slashes for protected paths", async () => {
    process.env.SITE_PASSWORD = "secret";
    verifyAccessTokenEdge.mockResolvedValue(false);
    const { proxy } = await import("./proxy");
    const req = new NextRequest("https://example.com/research/secret-case/");
    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain(
      "/unlock/?unlock_redirect=%2Fresearch%2Fsecret-case%2F"
    );
  });

  it("passes through protected path when unlock=1 and cookie invalid (modal flow)", async () => {
    process.env.SITE_PASSWORD = "secret";
    verifyAccessTokenEdge.mockResolvedValue(false);
    const { proxy } = await import("./proxy");
    const req = new NextRequest("https://example.com/research/secret-case?unlock=1");
    const res = await proxy(req);
    expect(res.status).toBe(200);
  });

  it("strips unlock=1 from protected path when cookie is valid", async () => {
    process.env.SITE_PASSWORD = "secret";
    verifyAccessTokenEdge.mockResolvedValue(true);
    const { proxy } = await import("./proxy");
    const req = new NextRequest("https://example.com/research/secret-case?unlock=1");
    req.cookies.set(accessCookieName, "valid-token");
    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/research/secret-case");
    expect(res.headers.get("location")).not.toContain("unlock=1");
  });

  it("redirects protected path to unlock route", async () => {
    process.env.SITE_PASSWORD = "secret";
    verifyAccessTokenEdge.mockResolvedValue(false);
    const { proxy } = await import("./proxy");
    const req = new NextRequest("https://example.com/protected/secret");
    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/unlock?unlock_redirect=%2Fprotected%2Fsecret");
  });
});

import { createHmac, timingSafeEqual } from "crypto";
import { accessCookieName, accessCookieMaxAgeDays } from "./globals";
import { buildCookieHeader } from "./cookies/build-cookie-header";
import { isRequestHttps } from "./cookies/cookie-request-secure";

const MESSAGE = "access";

function getDeployId(): string {
  const v = process.env.ACCESS_TOKEN_VERSION;
  if (!v) return "local";
  return v;
}

function getSecret(): string | undefined {
  return process.env.SITE_PASSWORD;
}

function getSignedMessage(): string {
  return `${MESSAGE}:${getDeployId()}`;
}

export function createAccessToken(): string {
  const secret = getSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(getSignedMessage()).digest("base64url");
}

export function verifyAccessToken(value: string | undefined): boolean {
  if (!value) return false;
  const secret = getSecret();
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(getSignedMessage()).digest("base64url");
  if (value.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(value, "utf8"), Buffer.from(expected, "utf8"));
  } catch {
    return false;
  }
}

export function getAccessCookieHeader(headers: Headers): string {
  const token = createAccessToken();
  if (!token) return "";
  const maxAge = accessCookieMaxAgeDays * 24 * 60 * 60;
  return buildCookieHeader({
    name: accessCookieName,
    value: token,
    maxAge,
    secure: isRequestHttps(headers),
  });
}

export function getClearAccessCookieHeader(headers: Headers): string {
  return buildCookieHeader({
    name: accessCookieName,
    value: "",
    maxAge: 0,
    secure: isRequestHttps(headers),
  });
}

export const COOKIE_NAME = accessCookieName;

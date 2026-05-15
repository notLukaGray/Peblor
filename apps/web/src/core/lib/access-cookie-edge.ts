/**
 * Edge-compatible access token verification using Web Crypto (no Node.js crypto).
 * Used by middleware to gate /work/[slug] without forcing the page to be dynamic.
 *
 * Token format must match access-cookie.ts: HMAC-SHA256(secret, "access:" + deployId) as base64url.
 */

const MESSAGE = "access";

function getDeployId(): string {
  const v = process.env.ACCESS_TOKEN_VERSION;
  if (!v) return "local";
  return v;
}

function getSignedMessage(): string {
  return `${MESSAGE}:${getDeployId()}`;
}

function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i]! ^ b[i]!;
  }
  return result === 0;
}

/**
 * Compute the expected access token (HMAC-SHA256 of signed message, base64url).
 * Uses Web Crypto so it can run in Edge middleware.
 */
export async function createAccessTokenEdge(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const message = new TextEncoder().encode(getSignedMessage());
  const signature = await crypto.subtle.sign("HMAC", key, message);
  return arrayBufferToBase64url(signature);
}

/**
 * Verify that the cookie value matches the expected token (timing-safe).
 * Returns true only if secret is set and value matches.
 */
export async function verifyAccessTokenEdge(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const secret = process.env.SITE_PASSWORD;
  if (typeof secret !== "string" || !secret) return false;

  const expected = await createAccessTokenEdge(secret);

  const a = new TextEncoder().encode(value);
  const b = new TextEncoder().encode(expected);
  return timingSafeEqual(new Uint8Array(a), new Uint8Array(b));
}

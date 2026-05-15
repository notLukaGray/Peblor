/**
 * Whether the inbound request was made over HTTPS (SEC-12).
 * On Vercel, `x-forwarded-proto` reflects the client edge scheme (trusted proxy, SEC-9).
 */
export function isRequestHttps(headers: Headers): boolean {
  const raw = headers.get("x-forwarded-proto");
  if (raw) {
    const first = raw.split(",")[0]?.trim().toLowerCase();
    if (first === "https") return true;
    if (first === "http") return false;
  }
  return process.env.NODE_ENV === "production";
}

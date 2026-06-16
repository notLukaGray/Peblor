import cdnConfig from "@content/config/cdn.json";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a CSP nonce using the Web Crypto API (available in Edge Runtime). */
export function generateNonce(): string {
  return crypto.randomUUID();
}

/** Extract a hostname from a URL string. Returns empty string on failure. */
function getHostname(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

// CDN hostname — computed once per cold-start from the static config.
const cdnBase = (cdnConfig as { cdnBase?: string }).cdnBase ?? "";
const cdnHostname = cdnBase ? getHostname(cdnBase) : "";

// ---------------------------------------------------------------------------
// CSP builder
// ---------------------------------------------------------------------------

/**
 * Build a Content-Security-Policy header string.
 *
 * This is the single canonical CSP definition for the app. proxy.ts delegates
 * here so CSP directives are defined in exactly one place.
 *
 * Production uses 'unsafe-inline' for script-src (required by Next.js 16 RSC
 * streaming — see below for details). Development uses permissive script-src
 * for HMR / dev tools.
 */
export function buildCsp(): string {
  const isDev = process.env.NODE_ENV === "development";

  const directives: string[] = [
    `default-src 'self'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
  ];

  // ── Script & style ──────────────────────────────────────────────────────

  if (isDev) {
    directives.push(
      `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
      `style-src 'self' 'unsafe-inline'`
    );
  } else {
    // Production: 'unsafe-inline' is required for Next.js 16 RSC streaming
    // (self.__next_f.push inline scripts). Nonce-based CSP does not work here
    // because Next.js does not thread the nonce from the x-nonce request header
    // to framework-generated inline <script> tags in the RSC payload.
    //
    // Mitigations: frame-ancestors 'none' (above), object-src 'none' (above),
    // and strict origin-based connect-src / media-src restrictions (below).
    //
    // style-src needs 'unsafe-inline' because Peblor renders every element
    // with inline `style=` attributes from JSON definitions.
    directives.push(
      `script-src 'wasm-unsafe-eval' 'self' 'unsafe-inline'`,
      `style-src 'self' 'unsafe-inline'`
    );
  }

  // ── Image sources ───────────────────────────────────────────────────────

  const imgSrc = ["'self'", "data:", "blob:"];
  if (isDev) {
    // Dev: external images (Unsplash placeholders in presets, etc.)
    imgSrc.push("https:");
  }
  if (cdnHostname) {
    imgSrc.push(`https://${cdnHostname}`, "https://*.b-cdn.net");
  }
  directives.push(`img-src ${imgSrc.join(" ")}`);

  // ── Font sources ────────────────────────────────────────────────────────

  directives.push(`font-src 'self' https://fonts.bunny.net data:`);

  // ── Connect sources (XHR, fetch, WebSocket) ─────────────────────────────

  const connectSrc = ["'self'"];
  if (isDev) {
    // Dev: external fetches for Three.js GLTFLoader, lottie-web, Rive runtime
    connectSrc.push("https:", "ws:", "http://localhost:*");
  }
  connectSrc.push("https://va.vercel-scripts.com", "https://vitals.vercel-insights.com");
  directives.push(`connect-src ${connectSrc.join(" ")}`);

  // ── Media sources (video, audio) ────────────────────────────────────────

  const mediaSrc = ["'self'", "data:", "blob:"];
  if (isDev) {
    // Dev: external video/audio from samplelib.com, wikimedia.org, etc.
    mediaSrc.push("https:");
  }
  if (cdnHostname) {
    mediaSrc.push(`https://${cdnHostname}`, "https://*.b-cdn.net");
  }
  directives.push(`media-src ${mediaSrc.join(" ")}`);

  return directives.join("; ");
}

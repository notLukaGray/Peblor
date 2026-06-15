import { isMobileFromUserAgent, isMobileViewportWidth } from "@pb/core/util";
import { uiBreakpointDesktopPx } from "@/core/lib/globals";

/**
 * Resolve `isMobile` for server-rendered ("static") sections, which bake their
 * `[mobile, desktop]` responsive values into the SSR HTML once and never re-resolve
 * client-side (see ServerBreakpointProvider — it intentionally skips the resize
 * listener once a server breakpoint is provided, in device-type-provider.tsx).
 *
 * User-Agent sniffing alone is unreliable: a desktop browser narrowed to a phone-sized
 * viewport (or a headless/emulated browser that reports a desktop UA at a mobile width —
 * e.g. Chrome DevTools device emulation without a UA override) reports `isMobile: false`
 * from the UA while actually rendering at mobile width. That's exactly how 9 of 13
 * sections on /stolen/linear ended up permanently stuck rendering their desktop
 * `contentWidth` (1344px) inside a 375px viewport — see agents/steal-page-refinement,
 * item 0.1.
 *
 * This mirrors the client's `readDeviceTypeSnapshot` (device-type-provider.tsx): a
 * viewport counts as "mobile" if EITHER the UA looks like a mobile device OR the
 * measured width is narrower than the desktop breakpoint. The cookie-reported viewport
 * width (an actual measurement, set by BrowserDataClient) is the more reliable signal —
 * combining both means neither a misleading UA nor a missing cookie alone can force the
 * wrong breakpoint to be baked into the static HTML.
 *
 * The desktop breakpoint default comes from content/config/ui.json via uiBreakpointDesktopPx,
 * the same single source used by the client-side device-type-provider and CSS custom properties.
 */
export function resolveServerIsMobile(
  userAgent: string,
  canonicalViewportWidthPx: number | undefined,
  desktopBreakpointPx: number = uiBreakpointDesktopPx
): boolean {
  if (isMobileFromUserAgent(userAgent)) return true;
  if (canonicalViewportWidthPx == null) return false;
  return isMobileViewportWidth(canonicalViewportWidthPx, { desktop: desktopBreakpointPx });
}

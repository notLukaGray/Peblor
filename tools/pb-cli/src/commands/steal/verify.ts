import { CONTRACT_VERSION } from "@pb/contracts";
import { getPageAsync, getPeblorPropsFromPage } from "@pb/core/load";
import { findPagesDir, walkPages, isRecord } from "../../lib/pages.js";
import type { CommandIo } from "../types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// steal-verify — automated correctness check for stolen pages (and any page).
//
// Codifies "Layers 1-2" from agents/steal-page-refinement/REFINEMENT-PLAN.md Part 3:
// the two layers that are fully automatable without a live source reference, and
// that would have caught 3 of the 4 most severe bugs found in the original audit
// (0.1 mobile reflow, 0.3 the asset 404, and — via the asset sweep generalizing —
// 0.2's directory mess) automatically instead of via manual screenshot-squinting.
//
// Layer 1 (structural integrity) runs directly here — schema validation through the
// real strict-load pipeline, an asset-integrity HEAD sweep against the actually-served
// URLs, and internal route/link integrity. These need no browser.
//
// Layer 2 (responsive reflow) fundamentally requires rendering the page and measuring
// live DOM geometry at multiple viewports — there is no headless-browser dependency in
// this CLI (the project drives browser automation exclusively through the chrome-devtools
// MCP server, the same pattern steal.ts itself uses for its extraction passes). So this
// command emits a ready-to-run verification workflow — exact JS to evaluate via
// mcp__chrome-devtools__evaluate_script at each viewport, plus the assertions to check
// the results against — for an agent to execute and report back.
// ═══════════════════════════════════════════════════════════════════════════════

type PbClient = {
  validate: (value: unknown) => Promise<{ valid: boolean; diagnostics: unknown[] }>;
};

type Severity = "error" | "warning" | "info";

type Finding = {
  layer: 1 | 2;
  severity: Severity;
  path: string;
  message: string;
};

type StealVerifyArgs = {
  route?: string;
  baseUrl: string;
  viewports: string[];
  asJson: boolean;
  dryRun: boolean;
  help: boolean;
};

const DEFAULT_BASE_URL = "http://localhost:3000";

// userAgent + dprAndFlags travel together: Peblor's server-side breakpoint detection
// branches on MOBILE_UA_REGEX (/iPhone|iPad|iPod|Android/i) — see packages/core/src/lib/shared-utils.ts
// — NOT on viewport width alone. A bare resize_page() leaves the desktop UA in place,
// so "static"-classified sections render the desktop branch and get clipped by their
// `overflow: hidden` wrappers, producing a *false-positive* reflow failure that looks
// exactly like bug 0.1 but vanishes the moment the UA matches the viewport. Emulating
// device + UA together is the only way to see what an actual mobile visitor sees.
const VIEWPORT_PRESETS: Record<
  string,
  { width: number; height: number; dprAndFlags: string; userAgent: string }
> = {
  mobile: {
    width: 375,
    height: 812,
    dprAndFlags: "375x812x2,mobile,touch",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  },
  tablet: {
    width: 768,
    height: 1024,
    dprAndFlags: "768x1024x2,mobile,touch",
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  },
  desktop: {
    width: 1440,
    height: 900,
    dprAndFlags: "1440x900x1",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  },
};

function parseArgs(args: string[]): StealVerifyArgs {
  const asJson = args.includes("--json");
  const dryRun = args.includes("--dry-run");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();

  function flag(name: string): string | undefined {
    const i = args.indexOf(name);
    if (i < 0) return undefined;
    consumed.add(i);
    consumed.add(i + 1);
    return args[i + 1];
  }

  const baseUrlFlag = flag("--base-url");
  const viewportFlag = flag("--viewport");
  for (let i = 0; i < args.length; i++) {
    if (["--json", "--dry-run", "--help", "-h"].includes(args[i]!)) consumed.add(i);
  }

  const positional = args.filter((_, i) => !consumed.has(i));
  const requested = viewportFlag
    ? viewportFlag
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter((v) => v in VIEWPORT_PRESETS)
    : [];
  const viewports = requested.length > 0 ? requested : ["desktop", "mobile"];

  return {
    route: positional[0],
    baseUrl: baseUrlFlag ?? DEFAULT_BASE_URL,
    viewports,
    asJson,
    dryRun,
    help,
  };
}

function normalizeRoute(routeArg: string): string {
  return routeArg.replace(/^\/+/, "").replace(/\/+$/, "");
}

function previewUrlForRoute(route: string): string {
  return `/${route}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 1a — schema validation (strict-load: preset resolution, sidecar
// hydration, elementOrder/definitions cross-checks — the rich mode bug 0.6
// was about preserving, not the bare schema-only fallback)
// ─────────────────────────────────────────────────────────────────────────────

async function runSchemaValidation(
  pb: PbClient,
  route: string
): Promise<{
  pass: boolean;
  diagnosticCount: number;
  diagnostics: unknown[];
  findings: Finding[];
}> {
  const findings: Finding[] = [];
  try {
    const loaded = await getPageAsync(route);
    if (!loaded) {
      findings.push({
        layer: 1,
        severity: "error",
        path: "$",
        message: `Could not load page at route "${route}" — check it exists under content/pages/.`,
      });
      return { pass: false, diagnosticCount: 1, diagnostics: [], findings };
    }
    const result = await pb.validate(loaded);
    if (!result.valid) {
      for (const diag of result.diagnostics) {
        const d = isRecord(diag) ? diag : {};
        findings.push({
          layer: 1,
          severity: (d.severity as Severity) ?? "error",
          path: typeof d.path === "string" ? d.path : "$",
          message: typeof d.message === "string" ? d.message : "Validation diagnostic",
        });
      }
    }
    return {
      pass: result.valid,
      diagnosticCount: result.diagnostics.length,
      diagnostics: result.diagnostics,
      findings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    findings.push({
      layer: 1,
      severity: "error",
      path: "$",
      message: `Validation threw: ${message}`,
    });
    return { pass: false, diagnosticCount: 1, diagnostics: [], findings };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 1b — asset integrity sweep. Walks the fully RESOLVED page (post asset-URL
// injection, so refs are the actual served URLs — /api/media/... proxy redirects
// or same-origin static paths like /stolen/<site>/...) and HEAD-checks each
// unique one. This is the automated form of "does every image/video 404" — the
// exact class of bug that 0.3 was (a 177KB file sitting on disk at the wrong path,
// silently 404ing at runtime with nothing but a blank box to show for it).
// ─────────────────────────────────────────────────────────────────────────────

const MEDIA_EXT_RE =
  /\.(?:png|jpe?g|webp|avif|gif|svg|mp4|webm|m3u8|mpd|glb|gltf|hdr|exr)(?:[?#]|$)/i;

function isLikelyMediaRef(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  if (value.startsWith("data:") || value.startsWith("blob:")) return false;
  return value.startsWith("/api/media/") || MEDIA_EXT_RE.test(value);
}

function collectMediaRefs(value: unknown, pathSoFar: string, out: Map<string, Set<string>>): void {
  if (typeof value === "string") {
    if (isLikelyMediaRef(value)) {
      const set = out.get(value) ?? new Set<string>();
      set.add(pathSoFar);
      out.set(value, set);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectMediaRefs(v, `${pathSoFar}[${i}]`, out));
    return;
  }
  if (isRecord(value)) {
    for (const [key, v] of Object.entries(value)) {
      collectMediaRefs(v, pathSoFar ? `${pathSoFar}.${key}` : key, out);
    }
  }
}

function refToCheckUrl(ref: string, baseUrl: string): string | null {
  if (ref.startsWith("http://") || ref.startsWith("https://")) return ref;
  if (ref.startsWith("/")) return `${baseUrl}${ref}`;
  return null;
}

async function headCheck(url: string): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (res.status === 405 || res.status === 501) {
      // Some static servers don't support HEAD — fall back to a ranged GET.
      const getRes = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" } });
      const ok = getRes.status === 200 || getRes.status === 206 || getRes.status === 304;
      return { ok, status: getRes.status };
    }
    const ok = res.status === 200 || res.status === 206 || res.status === 304;
    return { ok, status: res.status };
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

async function runAssetIntegritySweep(
  resolvedSections: unknown,
  resolvedBg: unknown,
  bgDefinitions: unknown,
  baseUrl: string
): Promise<{
  pass: boolean;
  checked: number;
  skipped: number;
  failures: Array<{ ref: string; url: string; status: number; paths: string[]; error?: string }>;
  findings: Finding[];
}> {
  const refs = new Map<string, Set<string>>();
  collectMediaRefs(resolvedSections, "resolvedSections", refs);
  collectMediaRefs(resolvedBg, "resolvedBg", refs);
  collectMediaRefs(bgDefinitions, "bgDefinitions", refs);

  const findings: Finding[] = [];
  const failures: Array<{
    ref: string;
    url: string;
    status: number;
    paths: string[];
    error?: string;
  }> = [];
  let checked = 0;
  let skipped = 0;

  for (const [ref, paths] of refs) {
    const url = refToCheckUrl(ref, baseUrl);
    if (!url) {
      skipped++;
      findings.push({
        layer: 1,
        severity: "warning",
        path: [...paths][0] ?? "$",
        message: `Asset ref "${ref}" did not resolve to a same-origin or absolute URL — skipped (likely an unresolved asset key; check the RESOLVE stage ran).`,
      });
      continue;
    }
    checked++;
    const result = await headCheck(url);
    if (!result.ok) {
      const pathList = [...paths];
      failures.push({ ref, url, status: result.status, paths: pathList, error: result.error });
      findings.push({
        layer: 1,
        severity: "error",
        path: pathList[0] ?? "$",
        message: `Asset 404/unreachable: "${ref}" → ${url} returned ${result.error ?? `HTTP ${result.status}`} (referenced at ${pathList.length} location${pathList.length === 1 ? "" : "s"}: ${pathList.slice(0, 3).join(", ")}${pathList.length > 3 ? ", …" : ""})`,
      });
    }
  }

  return { pass: failures.length === 0, checked, skipped, failures, findings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 1c — internal route/link integrity. Same href-collection shape as the
// existing `check-routes` command, scoped to a single page's resolved tree (so
// it also covers sidecar-split sections — `getPeblorPropsFromPage` hydrates them).
// ─────────────────────────────────────────────────────────────────────────────

function collectInternalHrefs(
  value: unknown,
  pathSoFar: string,
  out: Map<string, Set<string>>
): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectInternalHrefs(v, `${pathSoFar}[${i}]`, out));
    return;
  }
  if (!isRecord(value)) return;

  function record(href: string, path: string): void {
    if (!href.startsWith("/") || href.startsWith("//")) return;
    const set = out.get(href) ?? new Set<string>();
    set.add(path);
    out.set(href, set);
  }

  for (const [key, v] of Object.entries(value)) {
    const childPath = pathSoFar ? `${pathSoFar}.${key}` : key;
    if (key === "href" && typeof v === "string") record(v, childPath);
    if (
      key === "type" &&
      v === "navigate" &&
      isRecord(value.payload) &&
      typeof (value.payload as Record<string, unknown>).href === "string"
    ) {
      record(
        (value.payload as Record<string, unknown>).href as string,
        `${childPath}.payload.href`
      );
    }
    collectInternalHrefs(v, childPath, out);
  }
}

function runRouteIntegrityCheck(
  _route: string,
  resolvedSections: unknown
): {
  pass: boolean;
  checked: number;
  broken: Array<{ href: string; count: number; paths: string[] }>;
  findings: Finding[];
} {
  const found = new Map<string, Set<string>>();
  collectInternalHrefs(resolvedSections, "resolvedSections", found);

  const pagesDir = findPagesDir();
  const knownRoutes = pagesDir
    ? new Set(walkPages(pagesDir).map((p) => p.route.replace(/\/$/, "") || "/"))
    : new Set<string>();

  const broken: Array<{ href: string; count: number; paths: string[] }> = [];
  const findings: Finding[] = [];
  for (const [href, paths] of found) {
    const normalized = href.replace(/\/$/, "").split("?")[0]!.replace(/\/$/, "") || "/";
    if (!knownRoutes.has(normalized)) {
      const pathList = [...paths];
      broken.push({ href, count: pathList.length, paths: pathList });
      findings.push({
        layer: 1,
        severity: "warning",
        path: pathList[0] ?? "$",
        message: `Internal-looking href "${href}" does not match any known page route (referenced ${pathList.length} time${pathList.length === 1 ? "" : "s"}: ${pathList.slice(0, 3).join(", ")}${pathList.length > 3 ? ", …" : ""}) — likely a source-site link that should carry "external: true" on a stolen page, or a genuinely broken internal link.`,
      });
    }
  }

  return { pass: broken.length === 0, checked: found.size, broken, findings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 2 — responsive/structural reflow check. THE layer that was missing and
// let bug 0.1 through: 9/13 sections rendering at a hardcoded 1344px inner width
// inside a 375px viewport, with zero automated signal. This needs live DOM
// geometry at multiple viewports, which means a real browser — emitted here as a
// workflow for an agent to run via the chrome-devtools MCP (the same mechanism
// steal.ts's own extraction passes use), not executed inline.
// ─────────────────────────────────────────────────────────────────────────────

const REFLOW_PROBE_SCRIPT = `() => {
  const root = document.scrollingElement || document.documentElement;
  const viewportWidth = window.innerWidth;

  // An element inside a deliberate horizontal-scroll container (carousels, scrollable
  // pill-navs, etc.) legitimately sits outside the viewport at rest — that is the whole
  // point of the pattern, and getBoundingClientRect() can't tell "off-screen because
  // broken" from "off-screen because scrollable". Walk up for an ancestor that can
  // actually scroll horizontally and treat its descendants as explained, not broken.
  function scrollableAncestor(el) {
    let node = el.parentElement;
    while (node && node !== document.body) {
      const style = getComputedStyle(node);
      const canScrollX =
        (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
        node.scrollWidth > node.clientWidth + 1;
      if (canScrollX) return node;
      node = node.parentElement;
    }
    return null;
  }

  const sectionEls = Array.from(document.querySelectorAll('[aria-label="Content block"], main > section, [data-pb-section-id]'));
  const overflowing = [];
  for (const el of sectionEls) {
    const inner = el.firstElementChild;
    const innerRect = inner ? inner.getBoundingClientRect() : el.getBoundingClientRect();
    const id = el.getAttribute('aria-label') || el.getAttribute('data-pb-section-id') || el.id || '(unlabeled section)';
    // A section's own scrollWidth > clientWidth is the deliberate-carousel signature
    // (it IS the scroll container) — only the *inner* wrapper rendering wider than the
    // viewport while the section clips it (overflow-x: hidden) is the bug-0.1 signature:
    // desktop-width content silently cut off with no way to reach it.
    const sectionScrolls = el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'hidden';
    if (innerRect.width > viewportWidth + 1 && !sectionScrolls) {
      overflowing.push({ id, kind: 'inner-wider-than-viewport-and-clipped', innerWidth: Math.round(innerRect.width), viewportWidth });
    }
  }

  const probe = Array.from(document.querySelectorAll('h1,h2,h3,p,a,button,img')).slice(0, 400);
  const offscreen = [];
  const explainedByScroll = [];
  for (const el of probe) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.x < -2 || r.x > viewportWidth + 2) {
      const entry = { tag: el.tagName.toLowerCase(), text: (el.textContent || '').trim().slice(0, 40), x: Math.round(r.x), width: Math.round(r.width) };
      const scrollAncestor = scrollableAncestor(el);
      if (scrollAncestor) explainedByScroll.push(entry);
      else offscreen.push(entry);
    }
  }

  return {
    viewportWidth,
    documentScrollWidth: root.scrollWidth,
    documentClientWidth: root.clientWidth,
    sectionCount: sectionEls.length,
    overflowingSectionCount: overflowing.length,
    overflowing: overflowing.slice(0, 25),
    offscreenElementCount: offscreen.length,
    offscreenSample: offscreen.slice(0, 25),
    explainedByScrollCount: explainedByScroll.length,
  };
}`;

function buildBrowserWorkflow(
  route: string,
  previewUrl: string,
  baseUrl: string,
  viewports: string[]
): Record<string, unknown> {
  const fullUrl = `${baseUrl}${previewUrl}`;
  const steps: Array<Record<string, unknown>> = [];

  for (const vp of viewports) {
    const preset = VIEWPORT_PRESETS[vp]!;
    steps.push({
      label: `emulate-${vp}`,
      tool: "mcp__chrome-devtools__emulate",
      params: { userAgent: preset.userAgent, viewport: preset.dprAndFlags },
      note: `CRITICAL — emulate device + UA *together*, do not use resize_page alone. Peblor's server-side breakpoint detection branches on the user-agent string (MOBILE_UA_REGEX = /iPhone|iPad|iPod|Android/i in packages/core/src/lib/shared-utils.ts), not on viewport width. Resizing a desktop-UA browser to ${preset.width}px makes "static"-classified sections render their *desktop* branch (e.g. a 1344px-wide inner wrapper) which then gets silently clipped by an overflow-hidden ancestor — a false positive that looks exactly like bug 0.1 but evaporates the instant the UA matches. (Verified empirically: resize-only showed a 1344px div and 51 "offscreen" elements including the primary CTAs; emulating the ${vp} UA together with the viewport made the CTAs render inside the viewport at expected positions.)`,
    });
    steps.push({
      label: `navigate-${vp}`,
      tool: "mcp__chrome-devtools__navigate_page",
      params: { type: "url", url: fullUrl },
      note: "Navigate (or re-navigate) AFTER emulation is set, so the server sees the emulated UA on first render — not just the client-side hydration. Wait for the main heading text to appear before proceeding.",
    });
    if (vp === viewports[0]) {
      steps.push({
        label: "console-error-sweep",
        tool: "mcp__chrome-devtools__list_console_messages",
        note: 'Layer 1d (cheap, would have caught bug 0.3 a second independent way): assert there are zero entries with level "error". Any 404/network error for an asset surfaces here even if the asset-integrity sweep above somehow missed it (e.g. client-fetched assets not present in the resolved JSON).',
      });
    }
    steps.push({
      label: `reflow-probe-${vp}`,
      tool: "mcp__chrome-devtools__evaluate_script",
      note: `Wait ~400ms after navigation for reflow, then run this exact script and record the structured result:\n\n${REFLOW_PROBE_SCRIPT}\n\nThe script already excludes elements legitimately inside horizontal-scroll containers (carousels, scrollable nav pills) via an ancestor overflow-x check — "explainedByScrollCount" tells you how many were filtered out so you can sanity-check that number isn't suspiciously huge.\n\nAssertions against the returned object:\n  • overflowingSectionCount === 0 — catches exactly the "1344px wrapper inside a 375px viewport, clipped by overflow-hidden" class of bug (bug 0.1)\n  • documentScrollWidth <= documentClientWidth + 1 — no page-level horizontal overflow/clipping\n  • offscreenElementCount === 0 — catches "CTA button rendered at x:558 in a 375px viewport, unreachable": content silently cut off outside the visible viewport with no scroll affordance\n\nAny non-empty "overflowing" or "offscreenSample" entry is a Layer-2 finding: { layer: 2, severity: "error", path: "<id>", message: "<kind> at <vp> — <details>" }.`,
    });
  }

  steps.push({
    label: "restore-emulation",
    tool: "mcp__chrome-devtools__emulate",
    params: {
      userAgent: "",
      viewport: `${VIEWPORT_PRESETS.desktop!.width}x${VIEWPORT_PRESETS.desktop!.height}x1`,
    },
    note: "Clear the UA/device override and restore desktop size when done.",
  });

  return {
    goal: `Layer 2 (responsive reflow) + Layer 1d (console errors) for ${route} — requires a live browser, run via chrome-devtools MCP and report results back into the steal-verify findings/score.`,
    previewUrl: fullUrl,
    viewports: viewports.map((v) => ({ name: v, ...VIEWPORT_PRESETS[v]! })),
    steps,
    reportBack: [
      "After running every step, append one Finding per discrepancy found to the steal-verify report:",
      '  { layer: 2, severity: "error" | "warning", path: "<section id or element descriptor>@<viewport>", message: "<what broke and by how much>" }',
      "A clean run (zero console errors, zero overflowing sections, zero offscreen elements at every viewport) means Layer 2 passes — note that explicitly so the report's score can be finalized.",
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring — weighted toward what's automatable today. Layer 1 sub-checks are
// hard pass/fail (they need no human judgment); Layer 2 is reported as "pending"
// until an agent runs the emitted workflow and reports results back.
// ─────────────────────────────────────────────────────────────────────────────

function computeScore(layer1Passes: boolean[]): number {
  if (layer1Passes.length === 0) return 0;
  const passing = layer1Passes.filter(Boolean).length;
  return Math.round((passing / layer1Passes.length) * 100);
}

export async function runStealVerify(pb: PbClient, args: string[], io: CommandIo): Promise<number> {
  const { route: routeArg, baseUrl, viewports, asJson, dryRun, help } = parseArgs(args);

  if (help) {
    io.printText(
      "Usage: pb-cli steal-verify <route> [--base-url <url>] [--viewport mobile,tablet,desktop] [--json] [--dry-run]"
    );
    io.printText("");
    io.printText(
      "Layers 1-2 of the steal-verify framework (see agents/steal-page-refinement/REFINEMENT-PLAN.md Part 3):"
    );
    io.printText("  Layer 1 — structural integrity (runs now, no browser needed):");
    io.printText(
      "    1a. Schema validation (strict-load — preset resolution, sidecar hydration, cross-refs)"
    );
    io.printText(
      "    1b. Asset integrity sweep — HEAD-check every resolved image/video/background URL"
    );
    io.printText(
      "    1c. Internal route/link integrity — every internal href resolves to a known page"
    );
    io.printText(
      "  Layer 2 — responsive reflow check (emitted as a workflow for an agent + chrome-devtools MCP):"
    );
    io.printText(
      "    Render at each viewport, assert no section/element overflows or sits offscreen"
    );
    io.printText("");
    io.printText("Requires a running dev server at --base-url (default http://localhost:3000).");
    return 0;
  }

  if (!routeArg) {
    io.printErrorText("Error: route is required.");
    io.printText(
      "Usage: pb-cli steal-verify <route> [--base-url <url>] [--viewport mobile,tablet,desktop] [--json]"
    );
    return 2;
  }

  const route = normalizeRoute(routeArg);
  const previewUrl = previewUrlForRoute(route);

  if (dryRun) {
    const workflow = buildBrowserWorkflow(route, previewUrl, baseUrl, viewports);
    const payload = {
      command: "steal-verify",
      route,
      previewUrl,
      baseUrl,
      dryRun: true,
      browserVerification: { workflow },
    };
    if (asJson) io.printJson(payload);
    else io.printText(JSON.stringify(payload, null, 2));
    return 0;
  }

  const findings: Finding[] = [];

  // Layer 1a
  const schema = await runSchemaValidation(pb, route);
  findings.push(...schema.findings);

  // Layer 1b + 1c need the resolved page tree — only fetchable if the page loaded.
  let assetSweep: Awaited<ReturnType<typeof runAssetIntegritySweep>> | null = null;
  let routeCheck: ReturnType<typeof runRouteIntegrityCheck> | null = null;

  try {
    const loaded = await getPageAsync(route);
    if (loaded) {
      const props = await getPeblorPropsFromPage(loaded, route);
      if (props) {
        assetSweep = await runAssetIntegritySweep(
          props.resolvedSections,
          props.resolvedBg,
          props.bgDefinitions,
          baseUrl
        );
        findings.push(...assetSweep.findings);

        routeCheck = runRouteIntegrityCheck(route, props.resolvedSections);
        findings.push(...routeCheck.findings);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    findings.push({
      layer: 1,
      severity: "error",
      path: "$",
      message: `Could not resolve page props for asset/route checks: ${message}`,
    });
  }

  const browserWorkflow = buildBrowserWorkflow(route, previewUrl, baseUrl, viewports);

  findings.push({
    layer: 2,
    severity: "info",
    path: previewUrl,
    message:
      "Layer 2 (responsive reflow + console-error sweep) requires a live browser and is NOT auto-executed by this command. Run the workflow in `browserVerification.workflow` via the chrome-devtools MCP and append its findings to this report — see Part 3 of the refinement plan for why this layer specifically (not Layer 4 visual diff) is what would have caught bug 0.1.",
  });

  const layer1Passes = [schema.pass, assetSweep?.pass ?? null, routeCheck?.pass ?? null].filter(
    (v): v is boolean => v !== null
  );
  const layer1Pass = layer1Passes.every(Boolean);
  const score = computeScore(layer1Passes);

  const payload = {
    command: "steal-verify",
    contractVersion: CONTRACT_VERSION,
    route,
    previewUrl: `${baseUrl}${previewUrl}`,
    baseUrl,
    pass: layer1Pass,
    score,
    scoreNote:
      "Score reflects Layer 1 (fully automated) only — schema validation, asset integrity, route integrity. Layer 2 is reported separately as 'pending' until an agent runs and reports the emitted browser workflow; it is the layer that would have caught bug 0.1 (mobile reflow), so do not treat a high Layer-1 score alone as 'verified.'",
    layer1: {
      schemaValidation: {
        pass: schema.pass,
        diagnosticCount: schema.diagnosticCount,
      },
      assetIntegrity: assetSweep
        ? {
            pass: assetSweep.pass,
            checked: assetSweep.checked,
            skipped: assetSweep.skipped,
            failureCount: assetSweep.failures.length,
            failures: assetSweep.failures,
          }
        : { pass: null, note: "Skipped — page failed to load/resolve." },
      routeIntegrity: routeCheck
        ? {
            pass: routeCheck.pass,
            checked: routeCheck.checked,
            brokenCount: routeCheck.broken.length,
            broken: routeCheck.broken,
          }
        : { pass: null, note: "Skipped — page failed to load/resolve." },
    },
    browserVerification: {
      status: "pending",
      workflow: browserWorkflow,
    },
    findings,
  };

  if (asJson) {
    if (layer1Pass) io.printJson(payload);
    else io.printErrorJson(payload);
  } else {
    io.printText(JSON.stringify(payload, null, 2));
  }

  return layer1Pass ? 0 : 1;
}

/**
 * SpeculationRules — server component that injects a `<script type="speculationrules">`
 * into the document head, enabling the Speculation Rules API for instant page
 * transitions via pre-rendering and pre-fetching.
 *
 * Strategy:
 *   - Pre-render top-level navigation links on hover/focus (`eagerness: "moderate"`)
 *     so the user gets instant navigations when they click.
 *   - Pre-render top-level pages on hover/focus so the user gets instant
 *     navigations when they click.
 *
 * The rules are static and baked into the HTML at build time (SSG). No client
 * JavaScript is needed to enable speculation — the browser parses the inline script
 * tag and handles speculation natively.
 */

type Eagerness = "immediate" | "eager" | "moderate" | "conservative";

interface SpeculationRule {
  source: "list";
  urls: string[];
  eagerness: Eagerness;
  /**
   * When `referrer_policy` is set, the browser sends the specified referrer
   * header on speculation requests. Omitted here — let the browser use the
   * document's referrer policy.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/speculationrules
   */
  referrer_policy?: string;
}

interface SpeculationRulesJson {
  prerender?: SpeculationRule[];
  prefetch?: SpeculationRule[];
}

export function SpeculationRules({ nonce }: { nonce?: string }) {
  const rules: SpeculationRulesJson = {
    prerender: [
      {
        source: "list",
        urls: ["/"],
        eagerness: "moderate",
      },
    ],
  };

  return (
    <script
      type="speculationrules"
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(rules) }}
    />
  );
}

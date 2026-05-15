import type { Metadata } from "next";
import {
  primaryFontConfig,
  secondaryFontConfig,
  monoFontConfig,
  fontDisplayNames,
} from "@/app/fonts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Typography style guide",
  description: "Test page for headings, body, and font weight styles",
};

const LOREM_HEADING = "LOREM IPSUM";
const LOREM_SUB = "lorem ipsum";
const BODY_NORMAL = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ";
const BODY_ITALIC =
  "Donec sit amet fermentum mi, nec mollis risus. Mauris lobortis quam odio, a porttitor pharetra interdum est.";

type TypographySpec = {
  font: string;
  weight: string;
  size: string;
  letterSpacing: string;
  lineHeight: string;
};

function SpecList({ spec }: { spec: Partial<TypographySpec> }) {
  return (
    <dl className="typography-body-xs mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-muted-foreground">
      {spec.font && (
        <>
          <dt className="font-mono text-[11px]">Font:</dt>
          <dd className="font-mono text-[11px] wrap-break-word">{spec.font}</dd>
        </>
      )}
      {spec.weight && (
        <>
          <dt className="font-mono text-[11px]">Weight:</dt>
          <dd className="font-mono text-[11px]">{spec.weight}</dd>
        </>
      )}
      {spec.size && (
        <>
          <dt className="font-mono text-[11px]">Size:</dt>
          <dd className="font-mono text-[11px]">{spec.size}</dd>
        </>
      )}
      {spec.letterSpacing && (
        <>
          <dt className="font-mono text-[11px]">Letter Spacing:</dt>
          <dd className="font-mono text-[11px]">{spec.letterSpacing}</dd>
        </>
      )}
      {spec.lineHeight && (
        <>
          <dt className="font-mono text-[11px]">Line Height:</dt>
          <dd className="font-mono text-[11px]">{spec.lineHeight}</dd>
        </>
      )}
    </dl>
  );
}

const FONT_WEIGHTS = [
  { id: "black", label: "Black", cls: "typography-font-black", cssVar: "--font-weight-black" },
  { id: "bold", label: "Bold", cls: "typography-font-bold", cssVar: "--font-weight-bold" },
  {
    id: "regular",
    label: "Regular",
    cls: "typography-font-regular",
    cssVar: "--font-weight-regular",
  },
  { id: "book", label: "Book", cls: "typography-font-book", cssVar: "--font-weight-book" },
  { id: "light", label: "Light", cls: "typography-font-light", cssVar: "--font-weight-light" },
  { id: "thin", label: "Thin", cls: "typography-font-thin", cssVar: "--font-weight-thin" },
] as const;

const HEADINGS = [
  {
    id: "h1",
    label: "H1 — Heading Double Extra Large",
    cls: "typography-heading-2xl",
    size: "44px / 76px",
  },
  {
    id: "h2",
    label: "H2 — Heading Extra Large",
    cls: "typography-heading-xl",
    size: "30px / 50px",
  },
  { id: "h3", label: "H3 — Heading Large", cls: "typography-heading-lg", size: "26px / 40px" },
  { id: "h4", label: "H4 — Heading Medium", cls: "typography-heading-md", size: "22px / 32px" },
  { id: "h5", label: "H5 — Heading Small", cls: "typography-heading-sm", size: "20px / 30px" },
  {
    id: "h6",
    label: "H6 — Heading Extra Small",
    cls: "typography-heading-xs",
    size: "16px / 24px",
  },
] as const;

const BODY_STYLES = [
  {
    id: "p1",
    label: "P1 — Body Double Extra Large",
    cls: "typography-body-2xl",
    size: "26px / 18px mobile",
  },
  {
    id: "p2",
    label: "P2 — Body Extra Large",
    cls: "typography-body-xl",
    size: "26px / 18px mobile",
  },
  { id: "p3", label: "P3 — Body Large", cls: "typography-body-lg", size: "22px / 12px mobile" },
  { id: "p4", label: "P4 — Body Medium", cls: "typography-body-md", size: "22px / 12px mobile" },
  { id: "p5", label: "P5 — Body Small", cls: "typography-body-sm", size: "12px / 8px mobile" },
  {
    id: "p6",
    label: "P6 — Body Extra Small",
    cls: "typography-body-xs",
    size: "12px / 8px mobile",
  },
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border pb-8 md:pb-12 last:border-0">
      <h2 className="typography-heading-md mb-6 md:mb-8">{title}</h2>
      <div className="flex flex-col gap-6 md:gap-10">{children}</div>
    </section>
  );
}

function SampleRow({
  label,
  className,
  spec,
  children,
}: {
  label: string;
  className: string;
  spec?: Partial<TypographySpec>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-8 border-b border-border/50 pb-6 last:border-0 last:pb-0">
      <div className="md:min-w-[220px] md:shrink-0 md:max-w-[280px]">
        <p className="typography-body-sm text-muted-foreground font-mono text-xs">.{className}</p>
        <p className="typography-body-xs mt-0.5 text-muted-foreground text-xs">{label}</p>
        {spec && <SpecList spec={spec} />}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export default function StyleGuidePage() {
  const slots = [
    {
      slot: "primary",
      label: "Primary",
      config: primaryFontConfig,
      name: fontDisplayNames.primary,
      cssVar: "--font-primary",
      semanticVars: ["--font-heading", "--font-body"],
      tailwind: "font-sans",
    },
    {
      slot: "secondary",
      label: "Secondary",
      config: secondaryFontConfig,
      name: fontDisplayNames.secondary,
      cssVar: "--font-secondary",
      semanticVars: ["--font-accent"],
      tailwind: "font-serif",
    },
    {
      slot: "mono",
      label: "Mono",
      config: monoFontConfig,
      name: fontDisplayNames.mono,
      cssVar: "--font-mono-face",
      semanticVars: ["--font-mono"],
      tailwind: "font-mono",
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 md:max-w-[90%] md:px-10 md:py-12 lg:max-w-7xl lg:px-12 lg:py-16">
        <header className="mb-10 md:mb-14">
          <h1 className="typography-heading-2xl mb-3">Typography style guide</h1>
          <p className="typography-body-2xl text-muted-foreground">
            Configure fonts in{" "}
            <code className="font-mono text-[0.9em]">src/app/fonts/config.ts</code>. Flip{" "}
            <code className="font-mono text-[0.9em]">source</code> per slot to toggle local ↔
            webfont. Use <code className="font-mono text-[0.9em]">/dev/fonts</code> to preview and
            generate config snippets.
          </p>
        </header>

        <div className="flex flex-col gap-10 md:gap-14">
          <Section title="Typefaces & configuration">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[640px] text-left text-sm text-foreground">
                <thead>
                  <tr className="border-b border-border bg-muted/40 typography-body-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-mono text-[11px]">Slot</th>
                    <th className="px-3 py-2 font-mono text-[11px]">Typeface</th>
                    <th className="px-3 py-2 font-mono text-[11px]">Source</th>
                    <th className="px-3 py-2 font-mono text-[11px]">Weights</th>
                    <th className="px-3 py-2 font-mono text-[11px]">CSS var</th>
                    <th className="px-3 py-2 font-mono text-[11px]">Tailwind</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((row) => (
                    <tr key={row.slot} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-3 align-top font-medium">{row.label}</td>
                      <td className="px-3 py-3 align-top">{row.name}</td>
                      <td className="px-3 py-3 align-top font-mono text-[11px] text-muted-foreground">
                        {row.config.source}
                        {row.config.source === "webfont" && (
                          <span className="block text-[10px] opacity-80">
                            · {row.config.webfont.family}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top font-mono text-[11px] text-muted-foreground">
                        {Object.entries(row.config.weights)
                          .filter(([, v]) => v !== undefined)
                          .map(([name, value]) => `${name}: ${value}`)
                          .join(", ")}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {row.cssVar}
                        </span>
                        <div className="mt-1 font-mono text-[10px] leading-snug text-muted-foreground/80">
                          {row.semanticVars.join(" · ")}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top font-mono text-[11px]">{row.tailwind}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border border-border bg-card/30 p-4 space-y-3">
              <p className="typography-body-xs text-muted-foreground">Quick preview</p>
              <p className="font-sans text-base text-foreground">
                <span className="text-muted-foreground font-mono text-[11px] mr-2">primary</span>
                The quick brown fox jumps over the lazy dog. 0123456789
              </p>
              <p className="font-serif text-base text-foreground">
                <span className="text-muted-foreground font-mono text-[11px] mr-2">secondary</span>
                The quick brown fox jumps over the lazy dog. 0123456789
              </p>
              <p className="font-mono text-sm text-foreground">
                <span className="text-muted-foreground font-mono text-[11px] mr-2">mono</span>
                {"const x = 42; ∑ ∫ √∞ ≈ ≠ ≤ ≥ α β Ω"}
              </p>
            </div>
          </Section>

          <Section title="Font weights (primary)">
            {FONT_WEIGHTS.map(({ id, label, cls, cssVar }) => (
              <SampleRow
                key={id}
                label={label}
                className={cls}
                spec={{ font: `var(${cssVar})`, weight: cssVar }}
              >
                <p className={`${cls} text-[16px] leading-[24px] text-foreground`}>
                  <span className="typography-normal">{BODY_NORMAL}</span>
                  {primaryFontConfig.italic && (
                    <span className="typography-italic">{BODY_ITALIC}</span>
                  )}
                </p>
              </SampleRow>
            ))}
          </Section>

          <Section title="Headings (H1–H5)">
            {HEADINGS.map(({ id, label, cls, size }) => (
              <SampleRow key={id} label={label} className={cls} spec={{ size }}>
                <p className={cls}>
                  {LOREM_HEADING}
                  <br />
                  {LOREM_SUB}
                </p>
              </SampleRow>
            ))}
          </Section>

          <Section title="Body styles (P1–P6)">
            {BODY_STYLES.map(({ id, label, cls, size }) => (
              <SampleRow key={id} label={label} className={cls} spec={{ size }}>
                <p className={cls}>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sit amet fermentum
                  mi, nec mollis risus. Mauris lobortis quam odio, a porttitor{" "}
                  <span className="underline decoration-current underline-offset-2">
                    pharetra interdum est
                  </span>
                  .
                </p>
              </SampleRow>
            ))}
          </Section>
        </div>
      </div>
    </main>
  );
}

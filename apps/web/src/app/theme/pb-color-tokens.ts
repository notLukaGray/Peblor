/** Page builder color tokens surfaced in the M1 color dev tool (brand + links). */

export const M1_TOKEN_IDS = [
  "--pb-primary",
  "--pb-on-primary",
  "--pb-secondary",
  "--pb-on-secondary",
  "--pb-accent",
  "--pb-on-accent",
  "--pb-link",
  "--pb-link-hover",
  "--pb-link-active",
] as const;

export type M1TokenId = (typeof M1_TOKEN_IDS)[number];

export const M1_ON_PAIR: Partial<Record<M1TokenId, M1TokenId>> = {
  "--pb-on-primary": "--pb-primary",
  "--pb-on-secondary": "--pb-secondary",
  "--pb-on-accent": "--pb-accent",
  // Links appear on the secondary surface — measure contrast there
  "--pb-link": "--pb-secondary",
  "--pb-link-hover": "--pb-secondary",
  "--pb-link-active": "--pb-secondary",
};

export type M1TokenMeta = {
  label: string;
  /** For on-* tokens: fill token used for WCAG contrast hint. */
  contrastWith?: M1TokenId;
};

export const M1_TOKEN_META: Record<M1TokenId, M1TokenMeta> = {
  "--pb-primary": { label: "Primary" },
  "--pb-on-primary": { label: "On primary", contrastWith: "--pb-primary" },
  "--pb-secondary": { label: "Secondary" },
  "--pb-on-secondary": { label: "On secondary", contrastWith: "--pb-secondary" },
  "--pb-accent": { label: "Accent" },
  "--pb-on-accent": { label: "On accent", contrastWith: "--pb-accent" },
  "--pb-link": { label: "Link" },
  "--pb-link-hover": { label: "Link hover" },
  "--pb-link-active": { label: "Link active" },
};

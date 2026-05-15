export type Stability = "stable" | "experimental" | "deprecated";
export type Kind = "cluster" | "trigger" | "motion-preset";
export type Category = "element" | "section" | "background" | "module" | "modal";

export interface VariantAxis {
  name: string;
  fields: string[];
  note?: string;
  responsive?: boolean;
}

export interface CoverEntry {
  description: string;
  /** Path relative to the consumer app root. CI fails if the file does not exist. */
  example: string;
}

export interface DoesNotCoverEntry {
  what: string;
  /** Another catalog entry id, or `"external"` for things outside the peblor. */
  use_instead: string;
}

export interface ComposesWith {
  parents: string[];
  siblings_typical?: string[];
  motion?: string;
}

export interface ProposalHints {
  new_variant_value?: string;
  new_field_in_existing_axis?: string;
  new_axis?: string;
}

export interface CatalogEntry {
  id: string;
  kind: Kind;
  package: string;
  schema_ref: string;
  runtime_ref?: string;
  stability: Stability;
  schema_version: number;
  /** Set only on deprecated entries. Id of the replacement cluster. */
  superseded_by?: string;
  feels_like: string;
  not_this_if: string[];
  axes: VariantAxis[];
  covers: CoverEntry[];
  does_not_cover: DoesNotCoverEntry[];
  composes_with?: ComposesWith;
  known_limitations?: string[];
  proposal_hints?: ProposalHints;
}

export interface Catalog {
  version: string;
  generated_at: string;
  entries: CatalogEntry[];
}

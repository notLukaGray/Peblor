import type { MotionPropsFromJson, SectionBlock, SectionEffect } from "@pb/contracts";

/** Optional modal enter/exit animation config; when present, integration uses it (no hardcoding). */
export type ModalTransitionConfig = {
  enterDurationMs?: number;
  exitDurationMs?: number;
  easing?: string;
};

/**
 * Props for ModalRenderer. Same shape as returned by getModalProps().
 * Defined here so client components can import the type without pulling in modal-load (Node fs).
 */
export type ModalProps = {
  id: string;
  title?: string;
  resolvedSections: SectionBlock[];
  /** Optional; when set, modal enter/exit animation is driven by these values from JSON. */
  transition?: ModalTransitionConfig;
  /** Optional full FM config from JSON (initial, animate, exit, transition, variants). Overrides transition when set. */
  motion?: MotionPropsFromJson;
  /** Generic visual effects for the modal dialog surface, including glass. */
  effects?: SectionEffect[];
};

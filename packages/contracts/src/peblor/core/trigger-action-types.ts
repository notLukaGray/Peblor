/**
 * Trigger action types.
 *
 * All action types are derived from the Zod schemas in schema-primitives.ts.
 * Hand-maintained types have been replaced by:
 *   - `PeblorAction` / `TriggerAction` — inferred from `triggerActionSchemaCore`
 *   - Sub-unions like `Model3DAction`, `RiveAction`, `AssetAction` — extracted
 *     from the inferred union via `Extract`
 *
 * THIS FILE IS THIN.  New action variants need only a Zod schema entry
 * in `TRIGGER_ACTION_CORE_VARIANTS` (schema-primitives.ts).  The TypeScript
 * type is derived automatically.
 */

import type {
  ConditionOperator,
  VariableCondition,
  VisibleWhenConfig,
} from "./peblor-condition-evaluator";
import type { CoreTriggerAction } from "./peblor-schemas/schema-primitives";

export type { ConditionOperator, VariableCondition, VisibleWhenConfig };

export const OVERRIDE_KEY_BG = "bg" as const;

/** Canonical action union — inferred directly from the Zod schema. */
export type PeblorAction = CoreTriggerAction;

/** Alias for the full action union; use in trigger options and handler signatures. */
export type TriggerAction = PeblorAction;

// ---------------------------------------------------------------------------
// Sub-unions extracted from PeblorAction
// These let consumers narrow the action union without hand-maintaining types.
// Adding a new action variant to the Zod schema automatically propagates here.
// ---------------------------------------------------------------------------

export type Model3DAction = Extract<PeblorAction, { type: `three.${string}` }>;
export type RiveAction = Extract<PeblorAction, { type: `rive.${string}` }>;

export type AssetAction = Extract<
  PeblorAction,
  | { type: "assetPlay" }
  | { type: "assetPause" }
  | { type: "assetTogglePlay" }
  | { type: "assetNext" }
  | { type: "assetPrev" }
  | { type: "assetSeek" }
  | { type: "assetMute" }
  | { type: "videoFullscreen" }
>;

// Individual action type aliases — used by a few consumers that specifically
// discriminated by type (e.g. transition-id parsing).
export type ContentOverrideAction = Extract<PeblorAction, { type: "contentOverride" }>;
export type BackgroundSwitchAction = Extract<PeblorAction, { type: "backgroundSwitch" }>;
export type StartTransitionAction = Extract<PeblorAction, { type: "startTransition" }>;
export type StopTransitionAction = Extract<PeblorAction, { type: "stopTransition" }>;
export type UpdateTransitionProgressAction = Extract<
  PeblorAction,
  { type: "updateTransitionProgress" }
>;

/**
 * Section-level trigger options.
 * NOT derived from Zod — this type describes the options object used when
 * wiring triggers in JSON.  It has no direct schema equivalent because
 * the JSON shape is spread from section block schemas.
 */
export type SectionTriggerOptions = {
  onVisible?: TriggerAction;
  onInvisible?: TriggerAction;
  onProgress?: TriggerAction;
  onViewportProgress?: TriggerAction;
  threshold?: number;
  triggerOnce?: boolean;
  rootMargin?: string;
  delay?: number;
  sticky?: boolean;
  stickyOffset?: string;
};

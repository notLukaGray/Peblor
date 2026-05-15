/**
 * Coordinated z-index steps for layout, overlays, and /dev editors.
 * Injected as `--pb-z-*` for use in CSS (e.g. `z-index: var(--pb-z-modal)`).
 */
export type ZIndexLayerScale = {
  base: number;
  raised: number;
  overlay: number;
  modal: number;
  toast: number;
  tooltip: number;
  max: number;
};

export const DEFAULT_Z_INDEX_LAYERS: ZIndexLayerScale = {
  base: 0,
  raised: 10,
  overlay: 20,
  modal: 30,
  toast: 40,
  tooltip: 50,
  max: 9999,
};

export const Z_INDEX_LAYER_KEYS = [
  "base",
  "raised",
  "overlay",
  "modal",
  "toast",
  "tooltip",
  "max",
] as const satisfies readonly (keyof ZIndexLayerScale)[];

export function zIndexLayersToCssVars(layers: ZIndexLayerScale): Record<string, string> {
  return {
    "--pb-z-base": String(Math.round(layers.base)),
    "--pb-z-raised": String(Math.round(layers.raised)),
    "--pb-z-overlay": String(Math.round(layers.overlay)),
    "--pb-z-modal": String(Math.round(layers.modal)),
    "--pb-z-toast": String(Math.round(layers.toast)),
    "--pb-z-tooltip": String(Math.round(layers.tooltip)),
    "--pb-z-max": String(Math.round(layers.max)),
  };
}

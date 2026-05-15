import { z } from "zod";
import { dividerLayerSchema } from "./section-effect-schemas";

/**
 * Exporter / tooling metadata under `meta.figma`. Passthrough keeps forward
 * compatibility when the Figma plugin adds fields the runtime does not model yet.
 */
export const figmaExporterMetaSchema = z
  .object({
    /** Figma node `type` when relevant (e.g. fallback conversions). */
    sourceType: z.string().optional(),
    /** Layer name at export time. */
    sourceName: z.string().optional(),
    /**
     * Stable reason code when the exporter used a fallback representation.
     * Examples: `unsupported-node-type`, `group-conversion-fallback`, `instance-conversion-fallback`.
     * Drop-side codes (losses) live on `ExportResult.trace.counts.parity.dropReasons`.
     * See system docs in `docs/integration.md` and plugin docs in `tools/figma-plugin/docs/`.
     */
    fallbackReason: z.string().optional(),
    /**
     * Inferred stacked fills before a `[pb: fill=...]` override replaced `layers`
     * with a single `fill` for the runtime.
     */
    originalLayers: z.array(dividerLayerSchema).optional(),
  })
  .passthrough();

/**
 * Page-builder `meta` bag: namespaced exporter fields plus arbitrary extension keys.
 */
export const peblorMetaSchema = z
  .object({
    figma: figmaExporterMetaSchema.optional(),
  })
  .passthrough();

export type PeblorMeta = z.infer<typeof peblorMetaSchema>;
export type FigmaExporterMeta = z.infer<typeof figmaExporterMetaSchema>;

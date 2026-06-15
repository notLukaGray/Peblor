import fs from "fs";
import path from "path";
import { isSafePathSegment, resolvePathUnder } from "./peblor-paths";
import type { ModalBuilderFromSchema, PeblorDefinitionBlock } from "@pb/contracts";
import {
  modalBuilderSchema,
  modalBehaviorSchema,
  MOTION_DEFAULTS,
  sectionEffectSchema,
} from "@pb/contracts";
import type { ModalTransitionConfig } from "./modal-types";
import { motionPropsSchema } from "@pb/contracts";
import { CONTENT_DIR } from "./load/peblor-load-io";
import { parseJsonSafe } from "../lib/shared-utils";

const MODALS_DIR = path.join(CONTENT_DIR, "modals");

async function readModalJson(id: string): Promise<Record<string, unknown> | null> {
  if (!isSafePathSegment(id)) return null;
  const modalPath = resolvePathUnder(MODALS_DIR, `${id}.json`);
  if (!modalPath) return null;
  let raw: string;
  try {
    raw = await fs.promises.readFile(modalPath, "utf-8");
  } catch (err) {
    console.warn("[pb-core] Failed to read modal JSON", id, err);
    return null;
  }
  const result = parseJsonSafe<Record<string, unknown>>(raw);
  if (!result.ok) return null;
  return { ...result.data, id } as Record<string, unknown>;
}

async function getDefinitionsForModal(
  withId: Record<string, unknown>,
  id: string
): Promise<Record<string, PeblorDefinitionBlock>> {
  const definitions = withId.definitions as Record<string, PeblorDefinitionBlock> | undefined;
  if (
    definitions != null &&
    typeof definitions === "object" &&
    Object.keys(definitions).length > 0
  ) {
    return { ...definitions };
  }
  if (isSafePathSegment(id)) {
    const sectionsPath = resolvePathUnder(MODALS_DIR, `${id}-sections.json`);
    if (sectionsPath) {
      let sectionsRaw: string;
      try {
        sectionsRaw = await fs.promises.readFile(sectionsPath, "utf-8");
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          console.warn("[pb-core] Failed to read modal sections file", id, err);
        }
        return {};
      }
      const result = parseJsonSafe<Record<string, unknown>>(sectionsRaw);
      if (
        result.ok &&
        result.data?.definitions != null &&
        typeof result.data.definitions === "object"
      ) {
        return { ...(result.data.definitions as Record<string, PeblorDefinitionBlock>) };
      }
    }
  }
  return {};
}

async function loadModalSectionFile(
  id: string,
  sectionKey: string,
  definitions: Record<string, PeblorDefinitionBlock>
): Promise<void> {
  if (!isSafePathSegment(id) || !isSafePathSegment(sectionKey)) return;
  const sectionPath = resolvePathUnder(MODALS_DIR, id, `${sectionKey}.json`);
  if (!sectionPath) return;
  let raw: string;
  try {
    raw = await fs.promises.readFile(sectionPath, "utf-8");
  } catch (err) {
    console.warn("[pb-core] Failed to read modal section file", id, sectionKey, err);
    return;
  }
  const result = parseJsonSafe<Record<string, unknown>>(raw);
  if (!result.ok) return;
  const sectionData = result.data;
  const { definitions: sectionDefs } = sectionData as Record<string, unknown> & {
    definitions?: Record<string, unknown>;
  };
  if (sectionDefs != null && typeof sectionDefs === "object") {
    for (const [k, v] of Object.entries(sectionDefs)) {
      if (v != null && typeof v === "object") definitions[k] = v as PeblorDefinitionBlock;
    }
  }
  definitions[sectionKey] = sectionData as PeblorDefinitionBlock;
}

async function hydrateModalSectionFiles(
  definitions: Record<string, PeblorDefinitionBlock>,
  id: string,
  sectionOrder: string[]
): Promise<void> {
  if (!isSafePathSegment(id)) return;
  const idDir = resolvePathUnder(MODALS_DIR, id);
  if (!idDir) return;
  try {
    const stat = await fs.promises.stat(idDir);
    if (!stat.isDirectory()) return;
  } catch (err) {
    console.warn("[pb-core] Failed to stat modal directory", id, err);
    return;
  }
  for (const key of sectionOrder) {
    if (!isSafePathSegment(key)) continue;
    if (definitions[key] == null) await loadModalSectionFile(id, key, definitions);
  }
}

/**
 * Modal definition: same structure as a page (sectionOrder + definitions) but for modal content.
 * Used as input to expandPeblor (with no bg) to get sections.
 */
export type ModalBuilder = ModalBuilderFromSchema;

/**
 * Load a modal by id from src/content/modals/<id>.json and modals/<id>/*.json.
 * Returns a ModalBuilder (sectionOrder + definitions) that can be expanded like a page (no bg).
 * Returns null if not found or invalid.
 */
export async function loadModal(id: string): Promise<ModalBuilder | null> {
  if (!isSafePathSegment(id)) return null;
  const withId = await readModalJson(id);
  if (withId == null || !Array.isArray(withId.sectionOrder)) return null;

  const sectionOrder = withId.sectionOrder as string[];
  const definitions = await getDefinitionsForModal(withId, id);
  await hydrateModalSectionFiles(definitions, id, sectionOrder);

  const title = typeof withId.title === "string" ? withId.title : undefined;
  const rawTransition = withId.transition;
  let transition: ModalTransitionConfig;
  if (rawTransition != null && typeof rawTransition === "object" && !Array.isArray(rawTransition)) {
    const t = rawTransition as Record<string, unknown>;
    const enterMs =
      (MOTION_DEFAULTS.transition.enterDuration ?? MOTION_DEFAULTS.transition.duration) * 1000;
    const exitMs =
      (MOTION_DEFAULTS.transition.exitDuration ?? MOTION_DEFAULTS.transition.duration) * 1000;
    transition = {
      enterDurationMs: typeof t.enterDurationMs === "number" ? t.enterDurationMs : enterMs,
      exitDurationMs: typeof t.exitDurationMs === "number" ? t.exitDurationMs : exitMs,
      easing: typeof t.easing === "string" ? t.easing : MOTION_DEFAULTS.transition.ease,
    };
  } else {
    transition = {
      enterDurationMs:
        (MOTION_DEFAULTS.transition.enterDuration ?? MOTION_DEFAULTS.transition.duration) * 1000,
      exitDurationMs:
        (MOTION_DEFAULTS.transition.exitDuration ?? MOTION_DEFAULTS.transition.duration) * 1000,
      easing: MOTION_DEFAULTS.transition.ease,
    };
  }

  const motionResult = motionPropsSchema.safeParse(withId.motion);
  const motion = motionResult.success ? motionResult.data : undefined;
  const rawEffects = Array.isArray(withId.effects) ? withId.effects : undefined;
  const effects = rawEffects
    ?.map((effect) => sectionEffectSchema.safeParse(effect))
    .filter((result) => result.success)
    .map((result) => result.data);

  const behaviorResult = modalBehaviorSchema.safeParse(withId.behavior);
  const behavior = behaviorResult.success ? behaviorResult.data : undefined;

  const modalCandidate: ModalBuilder = {
    id,
    title,
    sectionOrder,
    definitions,
    transition,
    ...(motion !== undefined ? { motion } : {}),
    ...(effects && effects.length > 0 ? { effects } : {}),
    ...(behavior !== undefined ? { behavior } : {}),
  };
  const modalParse = modalBuilderSchema.safeParse(modalCandidate);
  if (!modalParse.success) return null;
  return modalParse.data;
}

// PASS 4 — GENERATE prompt builder (thin assembler).
//
// The only pass requiring AI reasoning: studies the measured reference data
// from passes 1-3 (layout rhythm, typography ratios, color relationships,
// responsive behavior, visual inventory) as a QUALITY BAR, then designs and
// builds a net-new, ORIGINAL Peblor page that clears a comparable bar using
// this project's own idioms — presets, tokens, placeholders. Each
// sub-protocol is a separate module — this file only assembles them into the
// final prompt object.

import path from "path";

import { findRepoRoot } from "./paths.js";
import { buildResponsiveDiff } from "./responsive-diff.js";
import {
  referenceFramingForInspiredGeneration,
  typeLanguageReferenceProtocol,
  colorLanguageReferenceProtocol,
  compositionLanguageReferenceProtocol,
  placeholderImageProtocol,
  netNewContentProtocol,
} from "./protocols.js";
import { schemaDiscoveryCalls } from "./schema-discovery.js";
import {
  fieldGotchas,
  compositionPatternsToStudy,
  mobileResponsiveness,
  pageStructureRules,
  perSectionWorkflow,
} from "./rules.js";
import {
  preGenerationSetup,
  writeSteps,
  validateLoop,
  validationGate,
  onValidationFailure,
} from "./workflow.js";

export function buildPass4Generate(args: {
  url: string;
  route: string;
  sitename: string;
}): Record<string, unknown> {
  const { url, route, sitename } = args;
  const repoRoot = findRepoRoot();
  const stateDir = path.join(repoRoot, "content/pages", route, "stealState");
  const pageDir = path.join(repoRoot, "content/pages", route);

  // Actively diff the desktop/mobile layout snapshots NOW — both files are
  // guaranteed to exist before Pass 4 runs (gated by passPrereqFiles).
  const responsiveDiff = buildResponsiveDiff(stateDir);

  return {
    pass: 4,
    phase: "generate",
    goal:
      "Study the measured reference data from passes 1-3 as a QUALITY BAR — its " +
      "type-scale ratios, color relationships, spacing rhythm, layout patterns, and " +
      "responsive behavior — then design and BUILD A NET-NEW, ORIGINAL Peblor page " +
      "that clears a comparable bar, using THIS project's own presets/tokens/catalog " +
      "and placeholder visuals throughout. This is not a clone: nothing about the " +
      "reference's brand, copy, colors, fonts, or imagery should survive into the " +
      "output. THIS IS THE ONLY PASS REQUIRING AI REASONING.",
    route,
    repoRoot,
    stateDir,

    // ── RESPONSIVE DIFF (computed, measured values) ──
    responsiveDiff,

    // ── REFERENCE FRAMING (read this first — sets the whole posture for the pass) ──
    referenceFraming: referenceFramingForInspiredGeneration(),

    // ── STEP 0: PRE-GENERATION SETUP ──
    preGenerationSetup: preGenerationSetup(stateDir),

    // ── STEP 1: SCHEMA DISCOVERY ──
    schemaDiscovery: schemaDiscoveryCalls(),

    // ── REFERENCE-GROUNDED PROTOCOLS (study the measured data, build with this project's idioms) ──
    typeLanguageReferenceProtocol: typeLanguageReferenceProtocol(),
    colorLanguageReferenceProtocol: colorLanguageReferenceProtocol(),
    compositionLanguageReferenceProtocol: compositionLanguageReferenceProtocol(),
    placeholderImageProtocol: placeholderImageProtocol(),
    netNewContentProtocol: netNewContentProtocol(sitename),

    // ── RULES ──
    compositionPatternsToStudy: compositionPatternsToStudy(),
    fieldGotchas: fieldGotchas(),
    mobileResponsiveness: mobileResponsiveness(),
    perSectionWorkflow: perSectionWorkflow(stateDir),
    pageStructureRules: pageStructureRules(),

    // ── VALIDATE LOOP ──
    validateLoop: validateLoop(pageDir),

    // ── WRITE AND SPLIT ──
    writeSteps: writeSteps(pageDir, route, url),

    // ── VALIDATION GATE ──
    validationGate: validationGate(pageDir),
    onValidationFailure: onValidationFailure(pageDir),
  };
}

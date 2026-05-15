/**
 * Export notes text generation: severity sections (errors, warnings, info,
 * prototype interactions) and annotation/naming convention reference.
 */

import type { ExportResult } from "./types/figma-plugin";

export function generateExportNotes(
  result: ExportResult,
  errors: string[],
  warningCount: number,
  infoCount: number
): string {
  const lines: string[] = [];
  lines.push("Page Builder Export Notes");
  lines.push("=".repeat(40));
  lines.push(`Pages exported: ${Object.keys(result.pages).length}`);
  lines.push(`Sections exported: ${Object.keys(result.presets).length}`);
  lines.push(`Modals exported: ${Object.keys(result.modals).length}`);
  lines.push(`Modules exported: ${Object.keys(result.modules).length}`);
  lines.push(`Elements exported: ${result.elementCount}`);
  lines.push(`Assets exported: ${result.assets.length}`);
  lines.push("");
  lines.push("Each page is also under content/pages/{slug}/ as index.json + {sectionKey}.json");
  lines.push("(mirrors content/pages split layout).");
  lines.push(
    "globals.json is NOT auto-loaded by the site — merge into content/modules or page definitions."
  );
  lines.push(`Errors: ${errors.length}`);
  lines.push(`Comments: ${warningCount + infoCount}`);
  lines.push(`Warnings: ${warningCount}`);
  lines.push(`Info notes: ${infoCount}`);
  lines.push("");

  if (errors.length > 0) {
    lines.push("ERRORS (output may be incomplete)");
    lines.push("-".repeat(40));
    for (const e of errors) {
      lines.push(`  ${e}`);
    }
    lines.push("");
  }

  const protoInteractions = result.warnings.filter((w) => w.startsWith("[proto-interaction]"));
  const regularWarnings = result.warnings.filter(
    (w) =>
      !w.startsWith("[proto-interaction]") &&
      !w.startsWith("[error]") &&
      !w.startsWith("[info]") &&
      !w.startsWith("[docs]")
  );
  const infoNotes = result.warnings.filter((w) => w.startsWith("[info]") || w.startsWith("[docs]"));

  if (regularWarnings.length > 0) {
    lines.push("WARNINGS");
    lines.push("-".repeat(40));
    for (const w of regularWarnings) {
      lines.push(`  ${w}`);
    }
    lines.push("");
  }

  if (infoNotes.length > 0) {
    lines.push("INFO / DOCUMENTATION NOTES");
    lines.push("-".repeat(40));
    for (const w of infoNotes) {
      lines.push(`  ${w}`);
    }
    lines.push("");
  }

  if (protoInteractions.length > 0) {
    lines.push(
      `PROTOTYPE INTERACTIONS (${protoInteractions.length} found — manual conversion required)`
    );
    lines.push("-".repeat(40));
    lines.push("These Figma prototype interactions were found but cannot be auto-converted.");
    lines.push("Use the peblor trigger system to recreate them:");
    lines.push("");
    for (const p of protoInteractions) {
      lines.push(`  ${p.replace("[proto-interaction] ", "")}`);
    }
    lines.push("");
    lines.push("Annotation hint: add [pb: type=button, action=navigate:/path] to button layers");
    lines.push("or [pb: onVisible=elementShow:target-id] to section layers.");
    lines.push("");
  }

  lines.push("INTENTIONALLY NOT CONVERTED");
  lines.push("-".repeat(40));
  lines.push("The following Figma features require manual peblor authoring:");
  lines.push("  • motionTiming / entrance animations — always manual");
  lines.push(
    "  • Responsive variants via Section[Desktop]+Section[Mobile] pairs — tuples emitted automatically"
  );
  lines.push("  • export-trace.json — machine-readable issue summary included alongside the ZIP");
  lines.push("  • Corner smoothing (squircle) — standard border-radius used");
  lines.push("  • LINEAR_BURN / LINEAR_DODGE blend modes — fell back to 'normal'");
  lines.push("  • Diamond / angular gradients — no CSS equivalent");
  lines.push(
    "  • Figma variables / bound values — numeric layout bindings emit var(--token, fallback) where supported"
  );
  lines.push("  • Component variants — skipped");
  lines.push("");
  lines.push("ANNOTATION SYSTEM");
  lines.push("-".repeat(40));
  lines.push("Add [pb: key=value] to layer names to embed peblor metadata:");
  lines.push("  [pb: type=button, href=/about]     → emits elementButton with href");
  lines.push("  [pb: type=spacer]                  → emits elementSpacer");
  lines.push("  [pb: onVisible=elementShow:id]     → adds onVisible trigger to section");
  lines.push("  [pb: onVisible=navigate:/path]     → navigate action on viewport enter");
  lines.push("  [pb: scrollSpeed=0.6]              → parallax scroll speed");
  lines.push("  [pb: action=modalOpen:contact]     → button action fires modalOpen");
  lines.push("  [pb: hidden=true]                  → hides element");
  lines.push("");
  lines.push("NAMING CONVENTION");
  lines.push("-".repeat(40));
  lines.push("Frame name prefix determines output target:");
  lines.push("  Page/*               → pages/{key}.json");
  lines.push("  Section/*            → presets/{key}.json");
  lines.push("  Section[Desktop]/*   → presets/{key}.json (merged with mobile pair)");
  lines.push("  Section[Mobile]/*    → merged into matching Section[Desktop] pair");
  lines.push("  Modal/*              → modals/{key}.json");
  lines.push("  Module/*         → modules/{key}.json");
  lines.push("  Button/*         → globals.json → buttons.{key}");
  lines.push("  Background/*     → globals.json → backgrounds.{key}");
  lines.push("  Global/*         → globals.json → elements.{key}");
  lines.push("  (no prefix)      → pages/{key}.json");

  return lines.join("\n");
}

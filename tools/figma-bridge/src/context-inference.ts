import { createIssue, createSuggestion, type RuleIssue, type SuggestionAction } from "./rules";
import { parseExportTargetFromLayerName } from "./export-target-parse";
import { slugify } from "./slugify";
import { stripAnnotations } from "./annotations-strip";
import type { InspectContext, InspectableNode } from "./inspect-types";

const GENERIC_NAME_RE =
  /^(Frame|Group|Rectangle|Ellipse|Text|Component|Section|Vector|Image|Polygon|Star|Line|Arrow)\s*\d*$/i;

function parentLooksLikePageFrame(parentName?: string): boolean {
  if (!parentName) return false;
  const base = stripAnnotations(parentName);
  return /^page\//i.test(base);
}

function inferSuggestedBaseName(
  node: InspectableNode,
  ctx: InspectContext | undefined
): string | null {
  if (!GENERIC_NAME_RE.test(node.name.trim())) return null;
  const mc = ctx?.mainComponentName?.trim();
  if (mc) return slugify(mc);
  const pn = ctx?.parentName;
  if (pn) {
    const stripped = stripAnnotations(pn);
    const slash = stripped.indexOf("/");
    const tail = slash >= 0 ? stripped.slice(slash + 1).trim() : stripped;
    const fromParent = slugify(tail || stripped);
    if (fromParent && fromParent !== "element") {
      const role = node.type === "TEXT" ? "copy" : "item";
      return `${fromParent}-${role}`;
    }
  }
  return null;
}

/**
 * Heuristic issues/suggestions using parent/sibling/component context.
 * Complements generic structure rules in `inspectUnified`.
 */
export function inferContextualInsights(
  node: InspectableNode,
  ctx?: InspectContext
): { issues: RuleIssue[]; suggestions: SuggestionAction[] } {
  const issues: RuleIssue[] = [];
  const suggestions: SuggestionAction[] = [];
  const parsed = parseExportTargetFromLayerName(node.name);
  const parentPage = parentLooksLikePageFrame(ctx?.parentName);

  if (parsed.kind === "global-element" && parentPage) {
    issues.push(
      createIssue(
        "structure",
        "Layer uses Global/ while nested under a Page/ frame — export may land in globals.json, not the page definitions map.",
        "warn",
        "context-inference"
      )
    );
    suggestions.push(
      createSuggestion(
        "set-target",
        "Use Page/… or a non-Global prefix so this lives in page definitions",
        {
          target: "page",
        }
      )
    );
  }

  if (node.type === "INSTANCE" && ctx?.mainComponentName) {
    const n = ctx.mainComponentName.toLowerCase();
    if (n.includes("button") || n.includes("cta")) {
      suggestions.push(
        createSuggestion(
          "inspect",
          "Button-like instance — exporter infers elementButton from naming; use [pb: type=button] only to force."
        )
      );
    }
    if (n.includes("card")) {
      suggestions.push(
        createSuggestion("set-target", "Card instance — consider Module/ for reusable blocks", {
          target: "module",
        })
      );
    }
  }

  const suggested = inferSuggestedBaseName(node, ctx);
  if (suggested) {
    suggestions.push(
      createSuggestion("inspect", `Rename hint: "${suggested}" (from parent/component)`)
    );
  }

  if (
    ctx?.siblingCount != null &&
    ctx.siblingCount >= 3 &&
    ctx.siblingIndex != null &&
    ctx.siblingIndex === 0 &&
    !node.hasAutoLayout &&
    (node.type === "FRAME" || node.type === "GROUP")
  ) {
    issues.push(
      createIssue(
        "structure",
        "Multiple siblings without auto-layout — export may mis-infer columns or stacking.",
        "info",
        "context-inference"
      )
    );
  }

  return { issues, suggestions };
}

export type IssueCategory =
  | "naming"
  | "structure"
  | "annotations"
  | "typography"
  | "motion"
  | "assets"
  | "responsive"
  | "content"
  | "other";

export type SuggestionActionKind =
  | "set-target"
  | "apply-annotation"
  | "promote-preset"
  | "keep-as-page"
  | "inspect"
  | "ignore";

export type HeuristicSignatureKind =
  | "frame"
  | "group"
  | "text"
  | "component"
  | "instance"
  | "variant";

export interface RuleIssue {
  severity: "error" | "warn" | "info";
  category: IssueCategory;
  message: string;
  source?: string;
}

export interface SuggestionAction {
  kind: SuggestionActionKind;
  label: string;
  target?: "page" | "preset" | "modal" | "module" | "skip" | "global";
  annotation?: Record<string, string>;
}

export interface HeuristicSignature {
  kind: HeuristicSignatureKind;
  name?: string;
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
  childCount?: number;
  visibleChildCount?: number;
  repeatedChildren?: number;
}

export function createIssue(
  category: IssueCategory,
  message: string,
  severity: RuleIssue["severity"] = "warn",
  source?: string
): RuleIssue {
  return { severity, category, message, source };
}

export function createSuggestion(
  kind: SuggestionActionKind,
  label: string,
  extras: Omit<SuggestionAction, "kind" | "label"> = {}
): SuggestionAction {
  return { kind, label, ...extras };
}

export function createHeuristicSignature(
  kind: HeuristicSignatureKind,
  props: Omit<HeuristicSignature, "kind"> = {}
): HeuristicSignature {
  return { kind, ...props };
}

export function summarizeCategories(issues: readonly RuleIssue[]): Record<IssueCategory, number> {
  const totals: Record<IssueCategory, number> = {
    naming: 0,
    structure: 0,
    annotations: 0,
    typography: 0,
    motion: 0,
    assets: 0,
    responsive: 0,
    content: 0,
    other: 0,
  };

  for (const issue of issues) {
    totals[issue.category] += 1;
  }

  return totals;
}

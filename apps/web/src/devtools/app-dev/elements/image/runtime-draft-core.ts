import type { CSSProperties } from "react";
import type { JsonValue } from "@pb/contracts";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import { evaluateVisibleWhen } from "./runtime-visible-when";

export const DEFAULT_IMAGE_RUNTIME_DRAFT: ImageRuntimeDraft = {
  linkEnabled: false,
  linkRef: "",
  linkExternal: false,
  cursor: "",
  visibleWhenEnabled: false,
  visibleWhenVariable: "",
  visibleWhenOperator: "equals",
  visibleWhenValue: "",
  visibleWhenPreviewValue: "",
  ariaLabel: "",
  wrapperStyleJson: "",
  figmaConstraintsJson: "",
  motionJson: "",
};

function parseJsonObject(text: string): Record<string, unknown> | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export function parseLooseValue(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return "";
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed;
  }
}

export function devPreviewParseLooseJsonValue(text: string): JsonValue {
  return parseLooseValue(text) as JsonValue;
}

export function buildRuntimePreviewState(draft: ImageRuntimeDraft): {
  visibleWhenMatches: boolean;
  wrapperStyle: CSSProperties | undefined;
  figmaConstraints: Record<string, unknown> | undefined;
  motion: Record<string, unknown> | undefined;
  linkHref: string | null;
  linkExternal: boolean;
  cursor: ImageRuntimeDraft["cursor"] | undefined;
  ariaLabel: string | undefined;
} {
  const currentValue = parseLooseValue(draft.visibleWhenPreviewValue);
  const expectedValue = parseLooseValue(draft.visibleWhenValue);
  const visibleWhenMatches =
    !draft.visibleWhenEnabled ||
    evaluateVisibleWhen(currentValue, expectedValue, draft.visibleWhenOperator);
  const trimmedHref = draft.linkRef.trim();
  return {
    visibleWhenMatches,
    wrapperStyle: parseJsonObject(draft.wrapperStyleJson) as CSSProperties | undefined,
    figmaConstraints: parseJsonObject(draft.figmaConstraintsJson),
    motion: parseJsonObject(draft.motionJson),
    linkHref: draft.linkEnabled && trimmedHref.length > 0 ? trimmedHref : null,
    linkExternal: draft.linkExternal,
    cursor: draft.cursor || undefined,
    ariaLabel: draft.ariaLabel.trim() || undefined,
  };
}

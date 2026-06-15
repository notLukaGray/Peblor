/** Token presets aligned with `/dev/colors` (M1 + derived `--pb-*` vars). */

export type WorkbenchColorTokenOption = { value: string; label: string };

export const WORKBENCH_COLOR_TOKEN_SELECT_OPTIONS: WorkbenchColorTokenOption[] = [
  { value: "", label: "Default (preview ink)" },
  { value: "var(--pb-text-primary)", label: "Text · primary" },
  { value: "var(--pb-text-secondary)", label: "Text · secondary" },
  { value: "var(--pb-text-muted)", label: "Text · muted" },
  { value: "var(--pb-text-inverse)", label: "Text · inverse" },
  { value: "var(--pb-primary)", label: "Brand · primary" },
  { value: "var(--pb-on-primary)", label: "Brand · on primary" },
  { value: "var(--pb-secondary)", label: "Brand · secondary" },
  { value: "var(--pb-on-secondary)", label: "Brand · on secondary" },
  { value: "var(--pb-accent)", label: "Brand · accent" },
  { value: "var(--pb-on-accent)", label: "Brand · on accent" },
  { value: "var(--pb-link)", label: "Link · default" },
  { value: "var(--pb-link-hover)", label: "Link · hover" },
  { value: "var(--pb-link-active)", label: "Link · active" },
  { value: "var(--pb-border)", label: "UI · border" },
  { value: "var(--pb-border-strong)", label: "UI · border strong" },
  { value: "var(--pb-danger)", label: "Semantic · danger" },
  { value: "var(--pb-success)", label: "Semantic · success" },
  { value: "var(--pb-warning)", label: "Semantic · warning" },
  { value: "var(--pb-info)", label: "Semantic · info" },
];

const TOKEN_VALUE_SET = new Set(
  WORKBENCH_COLOR_TOKEN_SELECT_OPTIONS.map((o) => o.value).filter(Boolean)
);

export function workbenchColorTokenSelectValue(color: string | undefined): string {
  const raw = color ?? "";
  return TOKEN_VALUE_SET.has(raw) ? raw : "";
}

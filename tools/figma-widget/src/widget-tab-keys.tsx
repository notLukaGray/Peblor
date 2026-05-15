import { getAllAnnotationTemplates } from "./rules";
import type { AnnotationTemplate } from "./rules";

// ── Design tokens ─────────────────────────────────────────────────────────────

const SURFACE = "#242424";
const SURFACE2 = "#2E2E2E";
const BORDER = "#333333";
const TEXT_PRIMARY = "#F0F0F0";
const TEXT_DIM = "#777777";

// ── Types ─────────────────────────────────────────────────────────────────────

type ScopeFilter = "all" | "element" | "section";

interface KeysTabProps {
  filter: string;
  scope: ScopeFilter;
  onFilterChange: (v: string) => void;
  onScopeChange: (s: ScopeFilter) => void;
}

const SCOPE_OPTIONS: ScopeFilter[] = ["all", "element", "section"];

// ── Component ─────────────────────────────────────────────────────────────────

export function KeysTab({ filter, scope, onFilterChange, onScopeChange }: KeysTabProps) {
  const { widget } = figma;
  const { AutoLayout, Text, Input } = widget;

  const allTemplates: AnnotationTemplate[] =
    scope === "all" ? getAllAnnotationTemplates(undefined) : getAllAnnotationTemplates(scope);

  const needle = filter.toLowerCase();
  const filtered = allTemplates.filter((t) =>
    needle.length === 0 ? true : (t.key + " " + t.description).toLowerCase().includes(needle)
  );
  const capped = filtered.slice(0, 20);

  return (
    <AutoLayout direction="vertical" width="fill-parent" spacing={8}>
      {/* Filter input */}
      <Input
        value={filter}
        placeholder="Filter keys…"
        onTextEditEnd={(e: { characters: string }) => onFilterChange(e.characters)}
        fontSize={10}
        fill={TEXT_DIM}
        width="fill-parent"
      />

      {/* Scope toggle */}
      <AutoLayout direction="horizontal" width="fill-parent" spacing={4}>
        {SCOPE_OPTIONS.map((opt) => (
          <AutoLayout
            key={opt}
            padding={{ vertical: 3, horizontal: 8 }}
            cornerRadius={4}
            fill={scope === opt ? SURFACE2 : ("transparent" as const)}
            onClick={() => onScopeChange(opt)}
          >
            <Text fontSize={9} fill={scope === opt ? TEXT_PRIMARY : TEXT_DIM}>
              {opt}
            </Text>
          </AutoLayout>
        ))}
      </AutoLayout>

      {/* Template list */}
      {capped.length === 0 ? (
        <AutoLayout padding={{ vertical: 8 }} width="fill-parent">
          <Text fontSize={10} fill={TEXT_DIM} width="fill-parent">
            No keys match
          </Text>
        </AutoLayout>
      ) : (
        <AutoLayout direction="vertical" width="fill-parent" spacing={5}>
          {capped.map((t, i) => (
            <AutoLayout
              key={`${t.scope}-${t.key}-${i}`}
              direction="vertical"
              width="fill-parent"
              padding={{ vertical: 6, horizontal: 8 }}
              cornerRadius={6}
              fill={SURFACE}
              spacing={3}
            >
              {/* Line 1: scope badge + key */}
              <AutoLayout
                direction="horizontal"
                width="fill-parent"
                verticalAlignItems="center"
                spacing={5}
              >
                <AutoLayout padding={{ vertical: 1, horizontal: 4 }} cornerRadius={3} fill={BORDER}>
                  <Text fontSize={8} fill={TEXT_DIM}>
                    {t.scope === "element" ? "elem" : "sect"}
                  </Text>
                </AutoLayout>
                <Text fontSize={10} fill={TEXT_PRIMARY} width="fill-parent">
                  {t.key}
                </Text>
              </AutoLayout>

              {/* Line 2: description */}
              <Text fontSize={9} fill={TEXT_DIM} width="fill-parent">
                {t.description}
              </Text>

              {/* Line 3: snippet in code-style box */}
              <AutoLayout
                padding={{ vertical: 3, horizontal: 6 }}
                cornerRadius={3}
                fill={SURFACE2}
                width="fill-parent"
              >
                <Text fontSize={8} fill={TEXT_DIM} width="fill-parent">
                  {t.snippet}
                </Text>
              </AutoLayout>
            </AutoLayout>
          ))}
        </AutoLayout>
      )}
    </AutoLayout>
  );
}

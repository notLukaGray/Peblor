import type { SpacingStepKey, StyleFoundationSlices } from "./style-foundation-slices-types";
import { SECTION_MARGIN_KEYS, SPACING_STEP_KEYS } from "./style-foundation-slices-types";

type Props = {
  spacingScale: Record<SpacingStepKey, string>;
  spacingOverrides: Record<SpacingStepKey, string>;
  spacingLocks: Partial<Record<SpacingStepKey, boolean>>;
  onSpacingOverrideChange: (key: SpacingStepKey, value: string) => void;
  onSpacingLockToggle: (key: SpacingStepKey) => void;
  foundationSlices: Pick<StyleFoundationSlices, "sectionMarginScale" | "sectionMarginScaleLocks">;
  onSectionMarginChange: (key: (typeof SECTION_MARGIN_KEYS)[number], value: string) => void;
  onSectionMarginLockToggle: (key: (typeof SECTION_MARGIN_KEYS)[number]) => void;
};

export function StyleFoundationSpacingSections({
  spacingScale,
  spacingOverrides,
  spacingLocks,
  onSpacingOverrideChange,
  onSpacingLockToggle,
  foundationSlices,
  onSectionMarginChange,
  onSectionMarginLockToggle,
}: Props) {
  return (
    <>
      <div className="space-y-3 rounded border border-border/70 p-3">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Spacing scale overrides
        </p>
        <div className="overflow-x-auto rounded border border-border/80">
          <table className="w-full min-w-[540px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                  Step
                </th>
                <th className="px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                  Resolved
                </th>
                <th className="px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                  Override
                </th>
                <th className="px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                  Lock
                </th>
              </tr>
            </thead>
            <tbody>
              {SPACING_STEP_KEYS.map((key) => (
                <tr key={key} className="border-b border-border/80 last:border-b-0">
                  <td className="px-3 py-2 text-sm font-medium text-foreground">{key}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {spacingScale[key]}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      value={spacingOverrides[key]}
                      onChange={(e) => onSpacingOverrideChange(key, e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                      <input
                        type="checkbox"
                        className="rounded border-border"
                        checked={spacingLocks[key] === true}
                        onChange={() => onSpacingLockToggle(key)}
                      />
                      Pin
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 rounded border border-border/70 p-3">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Section margin scale
        </p>
        <div className="overflow-x-auto rounded border border-border/80">
          <table className="w-full min-w-[480px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                  Step
                </th>
                <th className="px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                  Value
                </th>
                <th className="px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                  Lock
                </th>
              </tr>
            </thead>
            <tbody>
              {SECTION_MARGIN_KEYS.map((key) => {
                const locked = foundationSlices.sectionMarginScaleLocks[key];
                return (
                  <tr key={key} className="border-b border-border/80 last:border-b-0">
                    <td className="px-3 py-2 text-sm font-medium text-foreground">{key}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                        value={foundationSlices.sectionMarginScale[key]}
                        disabled={!locked}
                        onChange={(e) => onSectionMarginChange(key, e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <label className="inline-flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                        <input
                          type="checkbox"
                          className="rounded border-border"
                          checked={locked}
                          onChange={() => onSectionMarginLockToggle(key)}
                        />
                        Pin
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

import type { CSSProperties } from "react";
import type { PbContentGuidelines } from "@/app/theme/pb-content-guidelines-config";
import type { WorkbenchPreviewBreakpoint } from "@/app/dev/workbench/workbench-preview-context";
import type { PageDensity } from "@pb/contracts";
import { formatDisplayValue, ROW_META } from "./style-dev-config";
import { GuidelineFieldInput } from "./style-guideline-field-input";
import { SectionPreview } from "./style-section-preview";

type Section = {
  title: string;
  blurb: string;
  keys: (keyof PbContentGuidelines)[];
};

export function StyleGuidelineSections({
  visibleSections,
  locks,
  guidelines,
  proposed,
  onFieldEdit,
  toggleLock,
  previewVars,
  previewDensity,
  previewBreakpoint,
}: {
  visibleSections: Section[];
  locks: Record<keyof PbContentGuidelines, boolean>;
  guidelines: PbContentGuidelines;
  proposed: PbContentGuidelines;
  onFieldEdit: (key: keyof PbContentGuidelines, raw: string) => void;
  toggleLock: (key: keyof PbContentGuidelines) => void;
  previewVars: CSSProperties;
  previewDensity: PageDensity;
  previewBreakpoint: WorkbenchPreviewBreakpoint;
}) {
  return (
    <>
      {visibleSections.map((section) => (
        <section
          key={section.title}
          className="space-y-3 rounded-lg border border-border bg-card/20 p-4"
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              {section.title}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              {section.blurb}
            </p>
          </div>
          <div className="overflow-x-auto rounded border border-border/80">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                    Token
                  </th>
                  <th className="px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                    Proposed
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
                {section.keys.map((key) => {
                  const meta = ROW_META[key];
                  return (
                    <tr key={key} className="border-b border-border/80 last:border-b-0">
                      <td className="px-3 py-2.5 align-top">
                        <span className="text-sm font-medium text-foreground">{meta.label}</span>
                        <div className="font-mono text-[10px] text-muted-foreground">{key}</div>
                        {meta.hint ? (
                          <p className="mt-1 max-w-xs text-[10px] text-muted-foreground">
                            {meta.hint}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 align-top font-mono text-[10px] tabular-nums text-muted-foreground">
                        {formatDisplayValue(key, proposed)}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <GuidelineFieldInput
                          keyName={key}
                          guidelines={guidelines}
                          onFieldEdit={onFieldEdit}
                        />
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <label className="flex cursor-pointer items-center gap-2 font-mono text-[11px] text-muted-foreground">
                          <input
                            type="checkbox"
                            className="rounded border-border"
                            checked={locks[key]}
                            onChange={() => toggleLock(key)}
                          />
                          Lock
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <SectionPreview
            title={section.title}
            guidelines={guidelines}
            previewVars={previewVars}
            previewDensity={previewDensity}
            previewBreakpoint={previewBreakpoint}
            sectionKeys={section.keys}
          />
        </section>
      ))}
    </>
  );
}

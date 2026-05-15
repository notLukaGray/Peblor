import type { PbContentGuidelines } from "@/app/theme/pb-content-guidelines-config";
import { GuidelineFieldInput } from "@/devtools/app-dev/style/style-guideline-field-input";
import { ROW_META, formatDisplayValue } from "@/devtools/app-dev/style/style-dev-config";
import { FRAME_GUIDELINE_KEYS, type FrameGuidelineKey } from "./layout-frames-dev-state";

type Props = {
  allGuidelines: PbContentGuidelines;
  locks: Record<FrameGuidelineKey, boolean>;
  onFieldEdit: (key: FrameGuidelineKey, raw: string) => void;
  onLockToggle: (key: FrameGuidelineKey) => void;
};

export function LayoutFramesTokenTable({ allGuidelines, locks, onFieldEdit, onLockToggle }: Props) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card/20 p-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Frame fallback tokens
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          These values apply when section/content blocks omit explicit flex layout fields.
        </p>
      </div>
      <div className="overflow-x-auto rounded border border-border/80">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                Token
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
            {FRAME_GUIDELINE_KEYS.map((key) => {
              const meta = ROW_META[key];
              return (
                <tr key={key} className="border-b border-border/80 last:border-b-0">
                  <td className="px-3 py-2.5 align-top">
                    <span className="text-sm font-medium text-foreground">{meta.label}</span>
                    <div className="font-mono text-[10px] text-muted-foreground">{key}</div>
                    {meta.hint ? (
                      <p className="mt-1 max-w-xs text-[10px] text-muted-foreground">{meta.hint}</p>
                    ) : null}
                  </td>
                  <td className="space-y-1.5 px-3 py-2.5 align-top">
                    <GuidelineFieldInput
                      keyName={key}
                      guidelines={allGuidelines}
                      onFieldEdit={(nextKey, raw) => onFieldEdit(nextKey as FrameGuidelineKey, raw)}
                    />
                    <p className="font-mono text-[10px] text-muted-foreground">
                      Current: {formatDisplayValue(key, allGuidelines)}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <label className="flex cursor-pointer items-center gap-2 font-mono text-[11px] text-muted-foreground">
                      <input
                        type="checkbox"
                        className="rounded border-border"
                        checked={locks[key]}
                        onChange={() => onLockToggle(key)}
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
    </section>
  );
}

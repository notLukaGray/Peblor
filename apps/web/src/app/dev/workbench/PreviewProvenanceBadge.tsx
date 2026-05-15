import {
  PREVIEW_FIDELITY_MODE_LABELS,
  type PreviewFidelityMode,
} from "@/app/dev/workbench/preview-fidelity";

/** Dev-chrome styling only — not driven by `/dev/colors` so it matches the rest of the workbench UI. */
const MODE_CLASSNAMES: Record<PreviewFidelityMode, string> = {
  raw: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  guided: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  placeholder: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
};

export function PreviewProvenanceBadge({
  mode,
  className,
}: {
  mode: PreviewFidelityMode;
  className?: string;
}) {
  return (
    <span
      className={
        "inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide " +
        MODE_CLASSNAMES[mode] +
        (className ? " " + className : "")
      }
    >
      {PREVIEW_FIDELITY_MODE_LABELS[mode]}
    </span>
  );
}

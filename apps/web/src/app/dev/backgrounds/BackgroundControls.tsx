"use client";

import type {
  BackgroundDrafts,
  BackgroundPatchDraft,
  BackgroundPatternBlock,
  BackgroundType,
} from "./BackgroundsDevIndexClient";
import { themeStringToInputValue } from "@/app/dev/elements/_shared/theme-string";

type ControlsProps = {
  activeType: BackgroundType;
  drafts: BackgroundDrafts;
  patchDraft: BackgroundPatchDraft;
};

function fieldClassName(): string {
  return "rounded border border-border bg-background px-2.5 py-2 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-[11px] text-muted-foreground">
      <span className="font-mono uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

function VideoControls({ drafts, patchDraft }: ControlsProps) {
  const draft = drafts.backgroundVideo;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Video URL">
        <input
          value={draft.video}
          onChange={(event) => patchDraft("backgroundVideo", { video: event.target.value })}
          className={fieldClassName()}
        />
      </Field>
      <Field label="Poster">
        <input
          value={draft.poster ?? ""}
          onChange={(event) => patchDraft("backgroundVideo", { poster: event.target.value })}
          className={fieldClassName()}
        />
      </Field>
      <Field label="Overlay">
        <input
          value={themeStringToInputValue(draft.overlay)}
          onChange={(event) => patchDraft("backgroundVideo", { overlay: event.target.value })}
          className={fieldClassName()}
        />
      </Field>
    </div>
  );
}

function ImageControls({ drafts, patchDraft }: ControlsProps) {
  return (
    <Field label="Image URL">
      <input
        value={drafts.backgroundImage.image}
        onChange={(event) => patchDraft("backgroundImage", { image: event.target.value })}
        className={fieldClassName()}
      />
    </Field>
  );
}

function VariableControls({ drafts, patchDraft }: ControlsProps) {
  const layers = drafts.backgroundVariable.layers;
  const firstLayer = layers[0] ?? { fill: "transparent" };
  const secondLayer = layers[1] ?? { fill: "transparent" };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Layer 1 Fill">
        <input
          value={themeStringToInputValue(firstLayer.fill)}
          onChange={(event) =>
            patchDraft("backgroundVariable", {
              layers: [{ ...firstLayer, fill: event.target.value }, secondLayer],
            })
          }
          className={fieldClassName()}
        />
      </Field>
      <Field label="Layer 2 Fill">
        <input
          value={themeStringToInputValue(secondLayer.fill)}
          onChange={(event) =>
            patchDraft("backgroundVariable", {
              layers: [firstLayer, { ...secondLayer, fill: event.target.value }],
            })
          }
          className={fieldClassName()}
        />
      </Field>
      <Field label="Layer 2 Blend">
        <input
          value={secondLayer.blendMode ?? ""}
          onChange={(event) =>
            patchDraft("backgroundVariable", {
              layers: [firstLayer, { ...secondLayer, blendMode: event.target.value }],
            })
          }
          className={fieldClassName()}
        />
      </Field>
      <Field label="Layer 2 Opacity">
        <input
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={secondLayer.opacity ?? 1}
          onChange={(event) =>
            patchDraft("backgroundVariable", {
              layers: [firstLayer, { ...secondLayer, opacity: Number(event.target.value) }],
            })
          }
          className={fieldClassName()}
        />
      </Field>
    </div>
  );
}

function PatternControls({ drafts, patchDraft }: ControlsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Pattern Image">
        <input
          value={drafts.backgroundPattern.image}
          onChange={(event) => patchDraft("backgroundPattern", { image: event.target.value })}
          className={fieldClassName()}
        />
      </Field>
      <Field label="Repeat">
        <select
          value={drafts.backgroundPattern.repeat ?? "repeat"}
          onChange={(event) =>
            patchDraft("backgroundPattern", {
              repeat: event.target.value as BackgroundPatternBlock["repeat"],
            })
          }
          className={fieldClassName()}
        >
          <option value="repeat">repeat</option>
          <option value="repeat-x">repeat-x</option>
          <option value="repeat-y">repeat-y</option>
          <option value="no-repeat">no-repeat</option>
        </select>
      </Field>
    </div>
  );
}

function TransitionControls({ drafts, patchDraft }: ControlsProps) {
  const draft = drafts.backgroundTransition;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Progress">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={draft.progress ?? 0}
          onChange={(event) =>
            patchDraft("backgroundTransition", { progress: Number(event.target.value) })
          }
          className="w-full"
        />
      </Field>
      <Field label="Duration">
        <input
          type="number"
          value={draft.duration ?? 0}
          onChange={(event) =>
            patchDraft("backgroundTransition", { duration: Number(event.target.value) })
          }
          className={fieldClassName()}
        />
      </Field>
      <Field label="Easing">
        <input
          value={draft.easing ?? ""}
          onChange={(event) => patchDraft("backgroundTransition", { easing: event.target.value })}
          className={fieldClassName()}
        />
      </Field>
    </div>
  );
}

export function BackgroundControls(props: ControlsProps) {
  switch (props.activeType) {
    case "backgroundVideo":
      return <VideoControls {...props} />;
    case "backgroundImage":
      return <ImageControls {...props} />;
    case "backgroundVariable":
      return <VariableControls {...props} />;
    case "backgroundPattern":
      return <PatternControls {...props} />;
    case "backgroundTransition":
      return <TransitionControls {...props} />;
  }
}

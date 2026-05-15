"use client";

/* eslint-disable max-lines */

import { useState } from "react";
import { parseButtonAction } from "@pb/contracts";
import { SharedWorkbenchColorTokenFields } from "@/app/dev/elements/_shared/dev-controls";
import {
  isThemeStringObject,
  themeStringToInputValue,
  type ThemeStringLike,
} from "@/app/dev/elements/_shared/theme-string";
import type { ButtonElementDevController } from "./useButtonElementDevController";

type WrapperTextKey =
  | "wrapperFillHover"
  | "wrapperFillActive"
  | "wrapperFillDisabled"
  | "wrapperStrokeHover"
  | "wrapperTransition";

type WrapperNumberKey =
  | "wrapperScaleHover"
  | "wrapperScaleActive"
  | "wrapperScaleDisabled"
  | "wrapperOpacityHover";

type LinkKey = "linkHover" | "linkActive" | "linkDisabled" | "linkTransition";

type WrapperTextField = { key: WrapperTextKey; label: string; placeholder?: string };
type WrapperNumberField = {
  key: WrapperNumberKey;
  label: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
};
type LinkField = { key: LinkKey; label: string; placeholder?: string };
type SetVariantPatch = ButtonElementDevController["setVariantPatch"];
type ActiveVariant = ButtonElementDevController["activeVariant"];

const WRAPPER_TEXT_FIELDS: WrapperTextField[] = [
  { key: "wrapperFillHover", label: "Fill — hover", placeholder: "e.g. rgba(255,255,255,0.14)" },
  {
    key: "wrapperFillActive",
    label: "Fill — active/press",
    placeholder: "e.g. rgba(255,255,255,0.06)",
  },
  {
    key: "wrapperFillDisabled",
    label: "Fill — disabled",
    placeholder: "e.g. rgba(128,128,128,0.2)",
  },
  { key: "wrapperStrokeHover", label: "Stroke — hover", placeholder: "e.g. var(--foreground)" },
  {
    key: "wrapperTransition",
    label: "Wrapper transition",
    placeholder: "background 0.2s ease, transform 0.15s",
  },
];

const WRAPPER_NUMBER_FIELDS: WrapperNumberField[] = [
  {
    key: "wrapperScaleHover",
    label: "Scale — hover",
    placeholder: "1",
    min: 0.8,
    max: 1.2,
    step: 0.01,
  },
  {
    key: "wrapperScaleActive",
    label: "Scale — press",
    placeholder: "0.97",
    min: 0.8,
    max: 1.2,
    step: 0.01,
  },
  {
    key: "wrapperScaleDisabled",
    label: "Scale — disabled",
    placeholder: "1",
    min: 0.8,
    max: 1.2,
    step: 0.01,
  },
  {
    key: "wrapperOpacityHover",
    label: "Opacity — hover",
    placeholder: "0.85",
    min: 0,
    max: 1,
    step: 0.01,
  },
];

const LINK_FIELDS: LinkField[] = [
  { key: "linkHover", label: "Link — hover", placeholder: "var(--pb-link-hover)" },
  { key: "linkActive", label: "Link — active", placeholder: "var(--pb-link-active)" },
  { key: "linkDisabled", label: "Link — disabled", placeholder: "var(--pb-link-disabled)" },
  { key: "linkTransition", label: "Link transition", placeholder: "0.15s or 0.15" },
];

function stringifyVars(vars: Record<string, ThemeStringLike> | undefined): string {
  if (!vars || Object.keys(vars).length === 0) return "{}";
  const normalized = Object.fromEntries(
    Object.entries(vars).map(([key, value]) => [key, themeStringToInputValue(value)])
  );
  return JSON.stringify(normalized, null, 2);
}

function sanitizeInteractionVars(parsed: unknown): Record<string, string> | undefined {
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (k.startsWith("--") && typeof v === "string") out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function fieldValue(value: ThemeStringLike | undefined): string {
  return themeStringToInputValue(value);
}

function normalizeOptionalText(value: string): string | undefined {
  return value.trim().length > 0 ? value : undefined;
}

function ButtonCustomVarsEditor({
  activeVariant,
  initialDraft,
  setVariantPatch,
}: {
  activeVariant: ActiveVariant;
  initialDraft: string;
  setVariantPatch: SetVariantPatch;
}) {
  const [customVarsDraft, setCustomVarsDraft] = useState(initialDraft);
  const [customVarsError, setCustomVarsError] = useState<string | null>(null);

  const applyCustomVars = () => {
    const raw = customVarsDraft.trim();
    if (raw === "") {
      setVariantPatch(activeVariant, { wrapperInteractionVars: undefined });
      setCustomVarsError(null);
      return;
    }
    try {
      const parsed = JSON.parse(customVarsDraft) as unknown;
      const cleaned = sanitizeInteractionVars(parsed);
      setVariantPatch(activeVariant, { wrapperInteractionVars: cleaned });
      setCustomVarsError(null);
    } catch {
      setCustomVarsError("Invalid JSON");
    }
  };

  return (
    <div className="space-y-1">
      <label
        className="font-mono text-[10px] text-muted-foreground"
        htmlFor="btn-wrapper-custom-vars"
      >
        Custom wrapper CSS variables (JSON object)
      </label>
      <textarea
        id="btn-wrapper-custom-vars"
        value={customVarsDraft}
        spellCheck={false}
        rows={5}
        onChange={(e) => {
          setCustomVarsDraft(e.target.value);
          setCustomVarsError(null);
        }}
        onBlur={applyCustomVars}
        className={`w-full resize-y rounded border bg-background p-2 font-mono text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${
          customVarsError ? "border-destructive" : "border-border"
        }`}
        placeholder={'{\n  "--element-btn-fill-hover": "rgba(255,255,255,0.1)"\n}'}
      />
      {customVarsError ? (
        <p className="text-[10px] text-destructive">{customVarsError}</p>
      ) : (
        <p className="text-[10px] text-muted-foreground/70">
          Keys must start with <span className="font-mono">--</span>. Values are strings. Merged
          after built-in vars so you can override tokens such as{" "}
          <span className="font-mono">--element-btn-scale-hover</span>.
        </p>
      )}
    </div>
  );
}

export function ButtonStatesPanel({ controller }: { controller: ButtonElementDevController }) {
  const { active, activeVariant, setVariantPatch } = controller;
  const varsSnapshot = JSON.stringify(active.wrapperInteractionVars ?? null);
  const customVarsInitialDraft = stringifyVars(active.wrapperInteractionVars);

  const updateWrapperText = (key: WrapperTextKey, raw: string) => {
    setVariantPatch(activeVariant, { [key]: raw === "" ? undefined : raw });
  };

  const updateWrapperNumber = (key: WrapperNumberKey, raw: string) => {
    if (raw === "") {
      setVariantPatch(activeVariant, { [key]: undefined });
      return;
    }
    const n = Number(raw);
    setVariantPatch(activeVariant, { [key]: Number.isFinite(n) ? n : undefined });
  };

  const updateLink = (key: LinkKey, raw: string) => {
    if (raw === "") {
      setVariantPatch(activeVariant, { [key]: undefined });
      return;
    }
    if (key === "linkTransition") {
      const n = Number(raw);
      if (Number.isFinite(n) && raw.trim() !== "" && String(n) === raw.trim()) {
        setVariantPatch(activeVariant, { linkTransition: n });
        return;
      }
    }
    setVariantPatch(activeVariant, { [key]: raw });
  };

  const getWrapperText = (key: WrapperTextKey): string => {
    const v = (active as Record<string, unknown>)[key];
    return v != null ? String(v) : "";
  };

  const getWrapperNumber = (key: WrapperNumberKey): string => {
    const v = (active as Record<string, unknown>)[key];
    return v != null ? String(v) : "";
  };

  const getLink = (key: LinkKey): string => {
    const v = (active as Record<string, unknown>)[key];
    if (v == null) return "";
    if (typeof v === "number") return String(v);
    if (typeof v === "string" || isThemeStringObject(v)) return themeStringToInputValue(v);
    return String(v);
  };

  const inputClass =
    "h-7 w-44 rounded border border-border bg-background px-2 text-right font-mono text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring";

  const fullInputClass =
    "w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card/20 p-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Interaction
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Link vs action, disabled and external flags, label ink, link motion tokens, wrapper state
          CSS variables, and optional custom properties on the interactive shell.
        </p>
      </div>

      <div className="space-y-3 rounded border border-border/50 bg-muted/10 p-3">
        <p className="font-mono text-[10px] text-muted-foreground/90">Behavior</p>
        <label className="block space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Href (link)
          </span>
          <input
            type="text"
            className={fullInputClass}
            value={fieldValue(active.href)}
            onChange={(e) =>
              setVariantPatch(activeVariant, { href: normalizeOptionalText(e.target.value) })
            }
            placeholder="/work"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Action (button function)
          </span>
          <input
            type="text"
            className={fullInputClass}
            value={fieldValue(active.action)}
            onChange={(e) =>
              setVariantPatch(activeVariant, {
                action: parseButtonAction(normalizeOptionalText(e.target.value)),
              })
            }
            placeholder="assetTogglePlay"
          />
        </label>
        <p className="text-[10px] text-muted-foreground/80">
          Schema allows <span className="font-mono">href</span> or{" "}
          <span className="font-mono">action</span>, not both. Leave the unused field empty.
        </p>
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex items-center gap-2 rounded border border-border/60 bg-background/60 px-3 py-2 text-[11px] text-foreground">
            <input
              type="checkbox"
              checked={active.external === true}
              onChange={(e) => setVariantPatch(activeVariant, { external: e.target.checked })}
            />
            External link
          </label>
          <label className="inline-flex items-center gap-2 rounded border border-border/60 bg-background/60 px-3 py-2 text-[11px] text-foreground">
            <input
              type="checkbox"
              checked={active.disabled === true}
              onChange={(e) => setVariantPatch(activeVariant, { disabled: e.target.checked })}
            />
            Disabled
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <p className="font-mono text-[10px] text-muted-foreground/80">Label / link ink</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <SharedWorkbenchColorTokenFields
            idSuffix={`btn-${activeVariant}-label-ink-interaction`}
            label="Label color"
            value={active.linkDefault}
            onChange={(next) => setVariantPatch(activeVariant, { linkDefault: next })}
            helperText="Default label ink; with href it maps to element-link default. Without href, filled buttons use this for the label."
          />
        </div>
        {LINK_FIELDS.map((field) => (
          <div key={field.key} className="grid grid-cols-[1fr_auto] items-center gap-2">
            <label
              className="truncate font-mono text-[10px] text-muted-foreground"
              htmlFor={`btn-link-${field.key}`}
            >
              {field.label}
            </label>
            <input
              id={`btn-link-${field.key}`}
              type="text"
              value={getLink(field.key)}
              placeholder={field.placeholder}
              onChange={(e) => updateLink(field.key, e.target.value)}
              className={inputClass}
            />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="font-mono text-[10px] text-muted-foreground/80">Wrapper — motion</p>
        {WRAPPER_NUMBER_FIELDS.map((field) => (
          <div key={field.key} className="grid grid-cols-[1fr_auto] items-center gap-2">
            <label
              className="truncate font-mono text-[10px] text-muted-foreground"
              htmlFor={`btn-state-${field.key}`}
            >
              {field.label}
            </label>
            <input
              id={`btn-state-${field.key}`}
              type="number"
              value={getWrapperNumber(field.key)}
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              step={field.step}
              onChange={(e) => updateWrapperNumber(field.key, e.target.value)}
              className={inputClass}
            />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="font-mono text-[10px] text-muted-foreground/80">Wrapper — paint</p>
        {WRAPPER_TEXT_FIELDS.map((field) => (
          <div key={field.key} className="grid grid-cols-[1fr_auto] items-center gap-2">
            <label
              className="truncate font-mono text-[10px] text-muted-foreground"
              htmlFor={`btn-state-${field.key}`}
            >
              {field.label}
            </label>
            <input
              id={`btn-state-${field.key}`}
              type="text"
              value={getWrapperText(field.key)}
              placeholder={field.placeholder}
              onChange={(e) => updateWrapperText(field.key, e.target.value)}
              className={inputClass}
            />
          </div>
        ))}
      </div>

      <ButtonCustomVarsEditor
        key={`${activeVariant}-${varsSnapshot}`}
        activeVariant={activeVariant}
        initialDraft={customVarsInitialDraft}
        setVariantPatch={setVariantPatch}
      />

      <p className="text-[10px] text-muted-foreground/60">
        Leave fields blank to use defaults from the theme. Blur the JSON field to apply custom
        variables.
      </p>
    </section>
  );
}

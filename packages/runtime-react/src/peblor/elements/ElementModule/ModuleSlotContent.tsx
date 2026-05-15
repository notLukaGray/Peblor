"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import type {
  CssInlineStyle,
  ElementBlock,
  SectionDefinitionBlock,
} from "@pb/contracts/peblor/core/peblor-schemas";
import { ElementRenderer } from "@/peblor/elements/Shared/ElementRenderer";
import { generateElementKey } from "@pb/core/keys";
import { motion } from "@/peblor/integrations/framer-motion";
import type { Easing } from "@/peblor/integrations/framer-motion";
import { MOTION_DEFAULTS } from "@pb/contracts/peblor/core/peblor-motion-defaults";
import { SlotDefaultWrapperStyleContext, SlotDefinitionsContext } from "./ModuleSlotContext";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";
import { resolveThemeStyleObject } from "@/peblor/theme/theme-string";

const MOTION_DISPLAY_CONTENTS: CSSProperties = { display: "contents" };

export type ModuleSlotContentProps = {
  elements: ElementBlock[];
  getActionHandler: (action: string | undefined, payload?: number) => (() => void) | undefined;
  slotDefinitions: Record<string, SectionDefinitionBlock> | null;
  defaultWrapperStyle: CssInlineStyle;
  hasReveal: boolean;
  elementRevealMs: number;
  elementRevealStaggerMs: number;
  easing: string;
  /** Optional preset name (entrancePresets) for stagger item keyframes. When set, item initial/animate come from preset. */
  revealPreset?: string;
};

function SlotElement({
  block,
  index,
  getActionHandler,
  defaultWrapperStyle,
  isModuleGroup,
}: {
  block: ElementBlock;
  index: number;
  getActionHandler: ModuleSlotContentProps["getActionHandler"];
  defaultWrapperStyle: CssInlineStyle;
  isModuleGroup: boolean;
}) {
  const themeMode = usePeblorThemeMode();
  const action = (block as ElementBlock & { action?: string }).action;
  const actionPayload = (block as ElementBlock & { actionPayload?: number }).actionPayload;
  const handler = getActionHandler(action, actionPayload);
  const elContent = <ElementRenderer key={generateElementKey(block, index)} block={block} />;
  const elWrapperStyle = (block as ElementBlock & { wrapperStyle?: CssInlineStyle }).wrapperStyle;
  const groupLayout = isModuleGroup
    ? (block as ElementBlock & { flex?: string; width?: string })
    : null;
  const resolvedElementWrapperStyle = resolveThemeStyleObject(elWrapperStyle, themeMode);
  const resolvedDefaultWrapperStyle = resolveThemeStyleObject(defaultWrapperStyle, themeMode);
  const wrapperStyle: CSSProperties = isModuleGroup
    ? {
        ...(resolvedElementWrapperStyle as CSSProperties),
        ...(groupLayout?.flex ? { flex: groupLayout.flex } : {}),
        ...(groupLayout?.width ? { width: groupLayout.width } : {}),
      }
    : { ...resolvedDefaultWrapperStyle, ...(resolvedElementWrapperStyle ?? {}) };

  if (handler) {
    return (
      <button
        key={generateElementKey(block, index)}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handler();
        }}
        className="flex items-center justify-center shrink-0 text-white rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        style={{ cursor: "pointer", ...wrapperStyle }}
        aria-label={action ?? "Control"}
      >
        {elContent}
      </button>
    );
  }
  return (
    <div
      key={generateElementKey(block, index)}
      className={
        isModuleGroup
          ? "flex items-center justify-center min-w-0"
          : "shrink-0 flex items-center justify-center"
      }
      style={wrapperStyle}
    >
      {elContent}
    </div>
  );
}

/** Renders slot elements (buttons or divs) with context and reveal. Stagger/reveal driven by slot config; item keyframes from revealPreset or motionComponent. */
export function ModuleSlotContent({
  elements,
  getActionHandler,
  slotDefinitions,
  defaultWrapperStyle,
  hasReveal,
  elementRevealMs,
  elementRevealStaggerMs,
  easing,
  revealPreset,
}: ModuleSlotContentProps) {
  const items = elements.map((block, i) => (
    <SlotElement
      key={generateElementKey(block, i)}
      block={block}
      index={i}
      getActionHandler={getActionHandler}
      defaultWrapperStyle={defaultWrapperStyle}
      isModuleGroup={(block as ElementBlock).type === "elementGroup"}
    />
  ));

  const staggerVariants = useMemo(() => {
    const presets = MOTION_DEFAULTS.entrancePresets;
    const preset = revealPreset
      ? (presets[revealPreset] ??
        (MOTION_DEFAULTS.defaultEntrancePreset
          ? presets[MOTION_DEFAULTS.defaultEntrancePreset]
          : undefined))
      : undefined;
    const mc = MOTION_DEFAULTS.motionComponent;
    const initial = (preset?.initial ?? mc.initial) as Record<string, string | number | number[]>;
    const animateBase = (preset?.animate ?? mc.animate) as Record<
      string,
      string | number | number[]
    >;
    return {
      container: {
        initial: {},
        animate: {
          transition: {
            staggerChildren: elementRevealStaggerMs / 1000,
            delayChildren: 0,
          },
        },
      },
      item: {
        initial,
        animate: {
          ...animateBase,
          transition: {
            duration: elementRevealMs / 1000,
            ease: easing as Easing,
          },
        },
      },
    };
  }, [elementRevealMs, elementRevealStaggerMs, easing, revealPreset]);

  return (
    <SlotDefinitionsContext.Provider value={slotDefinitions}>
      <SlotDefaultWrapperStyleContext.Provider value={defaultWrapperStyle}>
        {hasReveal ? (
          <motion.div
            variants={staggerVariants.container}
            initial="initial"
            animate="animate"
            style={MOTION_DISPLAY_CONTENTS}
          >
            {items.map((child, i) => (
              <motion.div key={i} variants={staggerVariants.item} style={MOTION_DISPLAY_CONTENTS}>
                {child}
              </motion.div>
            ))}
          </motion.div>
        ) : (
          items
        )}
      </SlotDefaultWrapperStyleContext.Provider>
    </SlotDefinitionsContext.Provider>
  );
}

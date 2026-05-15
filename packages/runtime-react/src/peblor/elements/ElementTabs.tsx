"use client";

import { useState, useCallback } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import { generateElementKey } from "@pb/core/keys";
import { ElementLayoutWrapper } from "./Shared/ElementLayoutWrapper";
import { ElementRenderer } from "./Shared/ElementRenderer";

type Props = Extract<ElementBlock, { type: "elementTabs" }>;

export function ElementTabs({
  tabs = [],
  variant = "underline",
  activeTab: initialTab = 0,
  tabAlignment = "start",
  contentAnimation = "fade",
  lazyLoad,
  scrollable,
  keyboardNav,
  mobileCollapse,
  tabColor,
  tabActiveColor,
  tabActiveBackground,
  tabFontFamily,
  tabFontSize,
  tabFontWeight,
  tabGap,
  tabPadding,
  tabMinWidth,
  contentPadding,
  ariaLabel,
  width,
  height,
  align,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  zIndex,
  constraints,
  effects,
  interactions,
  wrapperStyle,
  opacity,
  blendMode,
  boxShadow,
  filter,
  backdropFilter,
  hidden,
}: Props) {
  const clampedInitial = Math.max(0, Math.min(initialTab, Math.max(0, tabs.length - 1)));
  const [active, setActive] = useState(clampedInitial);
  const [loaded, setLoaded] = useState<Set<number>>(
    new Set(lazyLoad ? [clampedInitial] : tabs.map((_, i) => i))
  );

  const selectTab = useCallback(
    (index: number) => {
      if (tabs[index]?.disabled) return;
      setActive(index);
      if (lazyLoad) setLoaded((prev) => new Set(prev).add(index));
    },
    [tabs, lazyLoad]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (!keyboardNav) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        let next = index + 1;
        while (next < tabs.length && tabs[next]?.disabled) next++;
        if (next < tabs.length) selectTab(next);
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        let prev = index - 1;
        while (prev >= 0 && tabs[prev]?.disabled) prev--;
        if (prev >= 0) selectTab(prev);
      }
      if (e.key === "Home") {
        e.preventDefault();
        let first = 0;
        while (first < tabs.length && tabs[first]?.disabled) first++;
        if (first < tabs.length) selectTab(first);
      }
      if (e.key === "End") {
        e.preventDefault();
        let last = tabs.length - 1;
        while (last >= 0 && tabs[last]?.disabled) last--;
        if (last >= 0) selectTab(last);
      }
    },
    [keyboardNav, tabs, selectTab]
  );

  const variantClasses: Record<string, string> = {
    underline: "border-b-2 border-transparent aria-selected:border-current",
    pill: "rounded-full px-4 py-1 aria-selected:bg-accent aria-selected:text-white",
    contained: "rounded-t-lg px-4 py-2 aria-selected:bg-background aria-selected:border-border",
    vertical: "border-l-2 border-transparent aria-selected:border-current pl-3 py-2",
  };

  const isVertical = variant === "vertical";

  const layout = {
    width: width as string | undefined,
    height: height as string | undefined,
    align: align as "left" | "center" | "right" | undefined,
    marginTop: marginTop as string | undefined,
    marginBottom: marginBottom as string | undefined,
    marginLeft: marginLeft as string | undefined,
    marginRight: marginRight as string | undefined,
    zIndex,
    constraints,
    effects,
    wrapperStyle,
    opacity,
    blendMode,
    boxShadow,
    filter,
    backdropFilter,
    hidden,
  };

  return (
    <ElementLayoutWrapper layout={layout} interactions={interactions}>
      <div
        className={`flex ${isVertical ? "flex-row" : "flex-col"}`}
        role="tablist"
        aria-label={ariaLabel}
      >
        {mobileCollapse ? (
          <select
            className="text-sm font-medium p-2 border rounded bg-background md:hidden"
            value={active}
            onChange={(e) => selectTab(Number(e.target.value))}
          >
            {tabs.map((tab, i) => (
              <option key={i} value={i} disabled={tab.disabled}>
                {tab.label}
              </option>
            ))}
          </select>
        ) : null}
        <div
          className={`flex ${isVertical ? "flex-col" : `flex-row ${scrollable ? "overflow-x-auto" : ""}`} ${mobileCollapse ? "hidden md:flex" : ""}`}
          style={{
            gap: (tabGap as string) ?? "0.25rem",
            justifyContent:
              tabAlignment === "start"
                ? "flex-start"
                : tabAlignment === "end"
                  ? "flex-end"
                  : tabAlignment === "stretch"
                    ? "stretch"
                    : "center",
          }}
        >
          {tabs.map((tab, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={active === i}
              aria-disabled={tab.disabled}
              aria-controls={`tabpanel-${i}`}
              disabled={tab.disabled}
              tabIndex={active === i ? 0 : -1}
              onClick={() => selectTab(i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={`${variantClasses[variant] ?? variantClasses.underline} text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-40`}
              style={{
                color: active === i ? (tabActiveColor as string) : (tabColor as string),
                backgroundColor: active === i ? (tabActiveBackground as string) : undefined,
                fontFamily: tabFontFamily as string,
                fontSize: tabFontSize as string | number | undefined,
                fontWeight: tabFontWeight as string | number | undefined,
                padding: tabPadding as string,
                minWidth: tabMinWidth as string,
              }}
            >
              {tab.icon && <span className="mr-1">{tab.icon}</span>}
              {tab.label}
              {tab.badge != null && (
                <span className="ml-1 text-xs bg-muted rounded-full px-1.5 py-0.5">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className={`relative ${isVertical ? "flex-1" : ""}`}>
          {tabs.map((tab, i) => (
            <div
              key={i}
              id={`tabpanel-${i}`}
              role="tabpanel"
              aria-hidden={active !== i}
              className={contentAnimation === "fade" ? "transition-opacity duration-200" : ""}
              style={{
                position:
                  contentAnimation === "fade"
                    ? active === i
                      ? "relative"
                      : ("absolute" as const)
                    : undefined,
                inset: contentAnimation === "fade" && active !== i ? 0 : undefined,
                opacity: active === i ? 1 : 0,
                pointerEvents: active === i ? "auto" : "none",
                visibility: contentAnimation === "fade" && active !== i ? "hidden" : undefined,
                display: contentAnimation !== "fade" && active !== i ? "none" : undefined,
              }}
            >
              {loaded.has(i) && (
                <div className="pt-4" style={{ padding: contentPadding as string }}>
                  {(tab.elements as Array<Record<string, unknown>>)?.map((el, j) => (
                    <ElementRenderer
                      key={generateElementKey(el as ElementBlock, j)}
                      block={el as ElementBlock}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </ElementLayoutWrapper>
  );
}

"use client";

import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ElementBlock, JsonValue } from "@pb/contracts/types";
import {
  getBodyTypographyClass,
  getHeadingTypographyClass,
  resolveFontFamily,
} from "@pb/core/typography";
import { lowerThemeStringToCss } from "@/peblor/theme/theme-string";
import { useDeviceType } from "@pb/runtime-react/core/providers/device-type-provider";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import { ElementLayoutWrapper } from "./Shared/ElementLayoutWrapper";
import { useVariable } from "@/peblor/runtime/peblor-variable-store";

type Props = Extract<ElementBlock, { type: "elementCounter" }>;

function readNumericVariable(value: JsonValue | undefined, fallback: number): number {
  if (value == null) return fallback;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function resolveEasing(easing: string | undefined, t: number): number {
  if (!easing || easing === "easeOut") return 1 - Math.pow(1 - t, 3);
  if (easing === "easeIn") return t * t * t;
  if (easing === "easeInOut") return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  if (easing === "linear") return t;
  return 1 - Math.pow(1 - t, 3);
}

function formatCounterValue(
  value: number,
  decimals: number,
  separator: boolean,
  locale: string | undefined
): string {
  const opts: Intl.NumberFormatOptions = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  };
  if (separator) {
    return value.toLocaleString(locale, opts);
  }
  if (locale) {
    return new Intl.NumberFormat(locale, opts).format(value);
  }
  return value.toFixed(decimals);
}

function counterTypographyClass(level: Props["level"], variant: Props["variant"]): string {
  if (level != null) return getHeadingTypographyClass(level);
  if (variant === "label") return getBodyTypographyClass(6);
  if (variant === "section") return getHeadingTypographyClass(3);
  if (variant === "display") return getHeadingTypographyClass(2);
  return "";
}

export function ElementCounter({
  target,
  start = 0,
  tween,
  variableTween,
  counterScroll,
  prefix = "",
  suffix = "",
  decimals = 0,
  separator = false,
  locale,
  trigger = "onVisible",
  level,
  variant,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  color,
  textFill,
  variableKey,
  aria,
  role,
  tabIndex,
  width,
  height,
  selfAlign,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  layer,
  constraints,
  effects,
  interactions,
  wrapperStyle,
  opacity,
  blendMode,
  boxShadow,
  filter,
  bgBlur,
  hidden,
}: Props) {
  const { isMobile } = useDeviceType();
  const variableValue = useVariable(variableKey ?? "");
  const counterScrollConfig = counterScroll ?? {};
  const scrollStart = counterScrollConfig.scrollStart ?? 0;
  const scrollEnd = counterScrollConfig.scrollEnd ?? 1;
  const scrollEasing = counterScrollConfig.easing;

  const resolvedTarget = useMemo(
    () => (variableKey ? readNumericVariable(variableValue, target) : target),
    [variableKey, variableValue, target]
  );

  const [current, setCurrent] = useState(start);
  const [animating, setAnimating] = useState(Boolean(trigger === "onMount" && !variableKey));
  const [variableTweening, setVariableTweening] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const variableTweenRafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const prefersReducedMotionRef = useRef(false);
  const currentRef = useRef(start);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = mq.matches;
    if (mq.matches && trigger === "onMount" && !variableKey) {
      requestAnimationFrame(() => {
        setCurrent(resolvedTarget);
        setAnimating(false);
      });
    }
    if (mq.matches && variableKey && trigger !== "onScroll") {
      cancelAnimationFrame(variableTweenRafRef.current);
      requestAnimationFrame(() => {
        setCurrent(resolvedTarget);
        setVariableTweening(false);
      });
    }
    const onChange = () => {
      prefersReducedMotionRef.current = mq.matches;
      if (mq.matches && trigger === "onMount" && !variableKey) {
        setCurrent(resolvedTarget);
        setAnimating(false);
      }
      if (mq.matches && variableKey && trigger !== "onScroll") {
        cancelAnimationFrame(variableTweenRafRef.current);
        setCurrent(resolvedTarget);
        setVariableTweening(false);
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [trigger, resolvedTarget, variableKey]);

  // onVisible trigger
  useEffect(() => {
    if (variableKey || trigger !== "onVisible") return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          if (prefersReducedMotionRef.current) {
            setCurrent(resolvedTarget);
          } else {
            setAnimating(true);
          }
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [trigger, resolvedTarget, variableKey]);

  // onScroll: drive value from intersection ratio between scrollStart and scrollEnd
  useEffect(() => {
    if (trigger !== "onScroll") return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const ratio = entry.intersectionRatio;
        const s = Math.min(scrollStart, scrollEnd);
        const e = Math.max(scrollStart, scrollEnd);
        if (ratio <= s) {
          setCurrent(start);
        } else if (ratio >= e) {
          setCurrent(resolvedTarget);
        } else {
          const p = (ratio - s) / (e - s);
          setCurrent(start + (resolvedTarget - start) * resolveEasing(scrollEasing, p));
        }
      },
      { threshold: Array.from({ length: 101 }, (_, i) => i / 100) }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [trigger, scrollStart, scrollEnd, resolvedTarget, start, scrollEasing]);

  // Time-based tween (onMount / onVisible)
  useEffect(() => {
    if (variableKey || !animating || trigger === "onScroll" || !tween) return;
    const { duration: tweenDuration, easing: tweenEasing } = tween;
    startTimeRef.current = performance.now();
    const range = resolvedTarget - start;

    function animate(now: number) {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / tweenDuration, 1);
      const eased = resolveEasing(tweenEasing, progress);
      setCurrent(start + range * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animating, resolvedTarget, start, tween, trigger, variableKey]);

  // Tween when the bound variable (or fallback target) changes — not used with onScroll.
  useEffect(() => {
    if (!variableKey || trigger === "onScroll" || !variableTween) return;

    cancelAnimationFrame(variableTweenRafRef.current);

    if (prefersReducedMotionRef.current) {
      setCurrent(resolvedTarget);
      setVariableTweening(false);
      return;
    }

    const from = currentRef.current;
    const to = resolvedTarget;
    if (Object.is(from, to)) {
      setVariableTweening(false);
      return;
    }

    const { duration: varDuration, easing: varEasing } = variableTween;
    setVariableTweening(true);
    const begin = performance.now();
    const range = to - from;
    let cancelled = false;

    function tick(now: number) {
      if (cancelled) return;
      const elapsed = now - begin;
      const progress = Math.min(elapsed / varDuration, 1);
      const eased = resolveEasing(varEasing, progress);
      if (progress < 1) {
        setCurrent(from + range * eased);
        variableTweenRafRef.current = requestAnimationFrame(tick);
      } else {
        setCurrent(to);
        setVariableTweening(false);
      }
    }

    variableTweenRafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(variableTweenRafRef.current);
      setVariableTweening(false);
    };
  }, [variableKey, trigger, resolvedTarget, variableTween]);

  const displayValue =
    trigger === "onScroll"
      ? Number.isFinite(current)
        ? current
        : resolvedTarget
      : variableKey
        ? Number.isFinite(current)
          ? current
          : resolvedTarget
        : Number.isFinite(current)
          ? current
          : resolvedTarget;
  const formatted = formatCounterValue(displayValue, decimals, separator, locale);

  const resolvedTextFill = lowerThemeStringToCss(textFill?.value);
  const resolvedColor = lowerThemeStringToCss(color);
  const resolvedFontFamily = resolveFontFamily(fontFamily);
  const resolvedFontSize = resolveResponsiveValue(fontSize, isMobile);

  const textStyle: CSSProperties = {
    letterSpacing: letterSpacing as CSSProperties["letterSpacing"],
    ...(resolvedFontFamily !== undefined ? { fontFamily: resolvedFontFamily } : {}),
    ...(resolvedFontSize !== undefined ? { fontSize: resolvedFontSize } : {}),
    ...(fontWeight !== undefined ? { fontWeight: fontWeight as CSSProperties["fontWeight"] } : {}),
  };

  if (textFill?.type === "gradient" && resolvedTextFill) {
    textStyle.backgroundImage = resolvedTextFill;
    textStyle.backgroundClip = "text";
    textStyle.WebkitBackgroundClip = "text";
    textStyle.color = "transparent";
    (textStyle as Record<string, unknown>).WebkitTextFillColor = "transparent";
  } else if (textFill?.type === "color" && resolvedTextFill) {
    textStyle.color = resolvedTextFill;
  } else if (resolvedColor !== undefined) {
    textStyle.color = resolvedColor;
  }

  const layout = {
    width: width as string | undefined,
    height: height as string | undefined,
    align: selfAlign as "left" | "center" | "right" | undefined,
    marginTop: marginTop as string | undefined,
    marginBottom: marginBottom as string | undefined,
    marginLeft: marginLeft as string | undefined,
    marginRight: marginRight as string | undefined,
    zIndex: layer,
    constraints,
    effects,
    wrapperStyle,
    opacity,
    blendMode,
    boxShadow,
    filter,
    backdropFilter: bgBlur,
    hidden,
  };

  const typoClass = counterTypographyClass(level, variant);
  const rafAnimating = Boolean(animating && trigger !== "onScroll" && !variableKey);
  const ariaBusy = rafAnimating || variableTweening || undefined;

  const figureProps = useMemo(
    () =>
      ({
        ...(role ? { role } : {}),
        ...(tabIndex !== undefined ? { tabIndex } : {}),
        ...(aria ?? {}),
      }) as ComponentPropsWithoutRef<"figure">,
    [role, tabIndex, aria]
  );

  return (
    <ElementLayoutWrapper layout={layout} interactions={interactions} figureProps={figureProps}>
      <div
        ref={ref}
        className={typoClass ? `tabular-nums ${typoClass}` : "tabular-nums"}
        aria-busy={ariaBusy}
      >
        <span style={textStyle}>
          {prefix}
          {formatted}
          {suffix}
        </span>
      </div>
    </ElementLayoutWrapper>
  );
}

"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ModalBehaviorFromSchema } from "@pb/contracts";
import type { ModalProps } from "@pb/core/modal";
import { SECTION_COMPONENTS } from "@/peblor/section";
import { generateSectionKey } from "@pb/core/keys";
import { SectionErrorBoundary } from "./SectionErrorBoundary";
import { ModalAnimationWrapper } from "@/peblor/integrations/framer-motion/modal-wrapper";
import { SectionGlassEffect } from "@/peblor/section/stack/SectionGlassEffect";
import { lowerThemeValueDeep } from "@/peblor/theme/theme-string";

const TABBABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const PRIORITY_FOCUS_SELECTOR =
  'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])';

function getTabbableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
  );
}

function getPriorityFocusTarget(root: HTMLElement): HTMLElement | null {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(PRIORITY_FOCUS_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
  );
  return candidates[0] ?? null;
}

// ---------------------------------------------------------------------------
// Behavior → style helpers (gap 2.4)
// ---------------------------------------------------------------------------

/** Map named size presets to CSS max-width values. */
const SIZE_MAX_WIDTHS: Record<NonNullable<ModalBehaviorFromSchema["size"]>, string> = {
  sm: "min(theme(maxWidth.sm),calc(100vw-2rem))",
  md: "min(theme(maxWidth.md),calc(100vw-2rem))",
  lg: "min(theme(maxWidth.lg),calc(100vw-2rem))",
  xl: "min(theme(maxWidth.xl),calc(100vw-2rem))",
  full: "100vw",
};

/**
 * Derive overlay flex-alignment classes from the position field.
 * center → centered dialog; edges → drawer/sheet anchored to that edge.
 */
function positionToAlignClasses(
  position: NonNullable<ModalBehaviorFromSchema["position"]>
): string {
  switch (position) {
    case "top":
      return "items-start justify-center";
    case "bottom":
      return "items-end justify-center";
    case "left":
      return "items-stretch justify-start";
    case "right":
      return "items-stretch justify-end";
    case "center":
    default:
      return "items-center justify-center";
  }
}

/**
 * Derive panel size classes from the behavior size preset.
 * Used only when explicit width/maxWidth/height/maxHeight are NOT set.
 */
function sizeToPanelClasses(size: NonNullable<ModalBehaviorFromSchema["size"]>): string {
  if (size === "full") return "w-full h-full max-w-none max-h-none";
  const mw = SIZE_MAX_WIDTHS[size];
  return `w-full max-w-[${mw}] max-h-[90vh]`;
}

type ResolvedOverlayStyles = {
  /** Tailwind classes for the overlay container (position, flex alignment, padding, z-index). */
  overlayClass: string;
  /** Inline styles for the overlay (custom z-index, backdrop color/blur). */
  overlayStyle: CSSProperties;
  /** Tailwind classes for the dialog panel (size constraints, overflow, shape). */
  panelClass: string;
  /** Inline styles for the dialog panel (explicit width/height overrides). */
  panelStyle: CSSProperties;
  /** Whether backdrop click should close the modal. */
  closeOnBackdropClick: boolean;
  /** Whether Escape key should close the modal. */
  closeOnEscape: boolean;
  /** Whether Tab focus trap is active. */
  trapFocus: boolean;
  /** Resolved aria-label (takes precedence over aria-labelledby). */
  ariaLabel: string | undefined;
};

/**
 * Compute overlay/panel styles and interaction flags from the behavior vocab.
 * When `behavior` is absent or a field is absent, preserves current runtime defaults.
 *
 * Current runtime defaults preserved:
 *   - backdrop: bg-black/80 backdrop-blur-sm
 *   - position: center (flex items-center justify-center)
 *   - size: md (max-w-md, max-h-90vh)
 *   - closeOnBackdropClick: true
 *   - closeOnEscape: true
 *   - trapFocus: true
 *   - zIndex: var(--pb-z-modal)
 */
function resolveBehaviorStyles(
  behavior: ModalBehaviorFromSchema | undefined,
  defaultBackdropClass: string
): ResolvedOverlayStyles {
  const closeOnBackdropClick = behavior?.closeOnBackdropClick ?? true;
  const closeOnEscape = behavior?.closeOnEscape ?? true;
  const trapFocus = behavior?.trapFocus ?? true;
  const ariaLabel = behavior?.ariaLabel;

  // --- Overlay z-index ---
  const zIndexStyle: CSSProperties =
    behavior?.zIndex !== undefined ? { zIndex: behavior.zIndex } : {};

  // --- Backdrop styling ---
  let backdropStyle: CSSProperties = {};
  let backdropClass = defaultBackdropClass;
  if (behavior?.backdrop !== undefined) {
    const { color, blur, hidden } = behavior.backdrop;
    if (hidden) {
      backdropClass = "bg-transparent";
      backdropStyle = {};
    } else {
      // Use inline styles for custom color/blur so arbitrary CSS values are supported
      const bgColor = color ?? undefined;
      const bgBlur = blur ?? undefined;
      if (bgColor !== undefined || bgBlur !== undefined) {
        backdropClass = "";
        backdropStyle = {
          ...(bgColor !== undefined ? { backgroundColor: bgColor } : {}),
          ...(bgBlur !== undefined ? { backdropFilter: `blur(${bgBlur})` } : {}),
        };
      }
    }
  }

  // --- Overlay position ---
  const position = behavior?.position ?? "center";
  const alignClasses = positionToAlignClasses(position);

  // --- Z-index class (only when not overridden by inline style) ---
  const zClass = behavior?.zIndex !== undefined ? "" : "z-[var(--pb-z-modal)]";

  const overlayClass = `fixed inset-0 ${zClass} flex ${alignClasses} p-4 ${backdropClass}`.trim();
  const overlayStyle: CSSProperties = { ...zIndexStyle, ...backdropStyle };

  // --- Panel size ---
  const size = behavior?.size ?? "md";

  const hasExplicitDimension =
    behavior?.width !== undefined ||
    behavior?.maxWidth !== undefined ||
    behavior?.height !== undefined ||
    behavior?.maxHeight !== undefined;

  let panelClass: string;
  const panelStyle: CSSProperties = hasExplicitDimension
    ? {
        ...(behavior?.width !== undefined ? { width: behavior.width } : {}),
        ...(behavior?.maxWidth !== undefined ? { maxWidth: behavior.maxWidth } : {}),
        ...(behavior?.height !== undefined ? { height: behavior.height } : {}),
        ...(behavior?.maxHeight !== undefined ? { maxHeight: behavior.maxHeight } : {}),
      }
    : {};

  if (hasExplicitDimension) {
    // Explicit dimensions: use inline styles; still apply overflow + rounding
    panelClass = "overflow-y-auto rounded-xl";
  } else if (position === "left" || position === "right") {
    // Drawer: full height, constrained width from size
    const mw = size !== "full" ? SIZE_MAX_WIDTHS[size] : "100vw";
    panelClass = `h-full max-w-[${mw}] overflow-y-auto`;
  } else if (position === "top" || position === "bottom") {
    // Sheet: full width, constrained height from size
    const mh = size !== "full" ? "90vh" : "100vh";
    panelClass = `w-full max-h-[${mh}] overflow-y-auto rounded-xl`;
  } else {
    panelClass = `${sizeToPanelClasses(size)} overflow-y-auto rounded-xl`;
  }

  return {
    overlayClass,
    overlayStyle,
    panelClass,
    panelStyle,
    closeOnBackdropClick,
    closeOnEscape,
    trapFocus,
    ariaLabel,
  };
}

// ---------------------------------------------------------------------------
// Event listener hook
// ---------------------------------------------------------------------------

/**
 * Listens to `peblor-modal` events and manages local open state for a modal by id.
 * Returns null when the modal has never been explicitly opened (hidden by default).
 */
function useModalEventListener(modalId: string, initialOpen: boolean): boolean {
  const [open, setOpen] = useState(initialOpen);

  useEffect(() => {
    const handler = (e: Event) => {
      const { type, id: targetId } = (e as CustomEvent<{ type: string; id?: string }>).detail;
      if (type === "modalOpen" && targetId === modalId) setOpen(true);
      if (type === "modalClose" && (!targetId || targetId === modalId)) setOpen(false);
      if (type === "modalToggle" && targetId === modalId) setOpen((v) => !v);
    };
    window.addEventListener("peblor-modal", handler as EventListener);
    return () => window.removeEventListener("peblor-modal", handler as EventListener);
  }, [modalId]);

  return open;
}

// ---------------------------------------------------------------------------
// Props types
// ---------------------------------------------------------------------------

type ModalRendererProps = ModalProps & {
  /** When set, enter/exit are driven by FM using transition from props (JSON). Omit for always-visible. */
  show?: boolean;
  /**
   * When true and `show` is omitted, modal manages its own open state by listening to
   * `peblor-modal` events targeting its `id`. Starts hidden; opens on `modalOpen` event.
   * When false/omitted and `show` is omitted, modal is always visible (existing behavior).
   */
  eventDriven?: boolean;
  /** Optional callback when overlay is clicked (e.g. close). Not used for unlock. */
  onOverlayClick?: () => void;
  /**
   * Override backdrop class. Only used when `behavior` is absent.
   * Callers that supply `behavior` should leave this unset.
   */
  overlayClassName?: string;
  /** Optional inline style for the overlay (e.g. animated backdropFilter). */
  overlayStyle?: CSSProperties;
  /** Override dialog container class. Only used when `behavior` is absent. */
  dialogClassName?: string;
};

// ---------------------------------------------------------------------------
// ModalContent — the inner rendered modal
// ---------------------------------------------------------------------------

function ModalContent({
  id,
  title,
  effects,
  resolvedSections,
  behavior,
  modalActive,
  onOverlayClick,
  overlayClassName,
  overlayStyle: overlayStyleProp,
  dialogClassName,
}: Omit<ModalRendererProps, "show"> & { modalActive: boolean }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const dialogContainerRef = useRef<HTMLDivElement | null>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  const assignOverlayRef = useCallback((el: HTMLDivElement | null) => {
    dialogContainerRef.current = el;
  }, []);

  // Resolve behavior into overlay/panel styles + interaction flags.
  // When overlayClassName / dialogClassName are passed explicitly (legacy callers like
  // WithUnlockModal), we skip behavior-derived class computation and use those directly.
  const defaultBackdropClass = "bg-black/80 backdrop-blur-sm";
  const resolved = resolveBehaviorStyles(behavior, defaultBackdropClass);

  // Legacy callers can still pass overlayClassName/dialogClassName to fully override.
  const hasLegacyOverlayClass = overlayClassName !== undefined;
  const hasLegacyDialogClass = dialogClassName !== undefined;

  const resolvedEffects = lowerThemeValueDeep(effects) as typeof effects;
  const hasGlassEffect = (resolvedEffects ?? []).some((effect) => effect.type === "glass");

  // Determine final overlay class
  const finalOverlayClass = hasLegacyOverlayClass ? overlayClassName : resolved.overlayClass;

  // Merge overlay inline styles: prop-provided style wins
  const finalOverlayStyle: CSSProperties = hasLegacyOverlayClass
    ? (overlayStyleProp ?? {})
    : { ...resolved.overlayStyle, ...(overlayStyleProp ?? {}) };

  // Determine final dialog/panel class
  let finalDialogClass: string;
  if (hasLegacyDialogClass) {
    finalDialogClass = dialogClassName;
  } else if (hasGlassEffect) {
    finalDialogClass = `relative ${resolved.panelClass} bg-transparent shadow-xl border border-white/15 p-6`;
  } else {
    finalDialogClass = `${resolved.panelClass} bg-background shadow-xl border border-border p-6`;
  }

  const closeOnEscape = hasLegacyOverlayClass ? true : resolved.closeOnEscape;
  const closeOnBackdropClick = hasLegacyOverlayClass ? true : resolved.closeOnBackdropClick;
  const trapFocus = hasLegacyOverlayClass ? true : resolved.trapFocus;
  const ariaLabel = resolved.ariaLabel;

  useEffect(() => {
    if (!modalActive) return;

    const prev = document.activeElement;
    if (prev instanceof HTMLElement) prevFocusRef.current = prev;

    const frameId = requestAnimationFrame(() => {
      const root = dialogContainerRef.current;
      if (!root) return;
      const priorityTarget = getPriorityFocusTarget(root);
      if (priorityTarget) {
        priorityTarget.focus();
        return;
      }
      const tabbable = getTabbableElements(root);
      (tabbable[0] ?? root).focus();
    });

    return () => {
      cancelAnimationFrame(frameId);
      const restore = prevFocusRef.current;
      prevFocusRef.current = null;
      if (restore?.isConnected) restore.focus();
    };
  }, [modalActive]);

  const handleDialogKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (!modalActive) return;

      if (e.key === "Escape" && closeOnEscape && onOverlayClick) {
        e.preventDefault();
        e.stopPropagation();
        onOverlayClick();
        return;
      }

      if (e.key !== "Tab" || !trapFocus) return;
      const root = dialogContainerRef.current;
      if (!root) return;

      const tabbable = getTabbableElements(root);
      const first = tabbable[0];
      const last = tabbable.at(-1);
      if (first == null || last == null) return;
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [modalActive, onOverlayClick, closeOnEscape, trapFocus]
  );

  // Determine aria attributes: ariaLabel wins over aria-labelledby
  const ariaLabelledBy = !ariaLabel && title ? `${id}-title` : undefined;

  return (
    <div
      ref={assignOverlayRef}
      id={id}
      className={finalOverlayClass}
      style={finalOverlayStyle}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      onClick={closeOnBackdropClick ? onOverlayClick : undefined}
      onKeyDown={handleDialogKeyDown}
    >
      <div
        ref={dialogRef}
        className={finalDialogClass}
        style={resolved.panelStyle}
        role="document"
        onClick={(e) => e.stopPropagation()}
      >
        {hasGlassEffect && (
          <SectionGlassEffect effects={resolvedEffects} sectionRef={dialogRef} variant="auto" />
        )}
        {title && (
          <h2 id={`${id}-title`} className="sr-only">
            {title}
          </h2>
        )}
        <div
          className={hasGlassEffect ? "relative z-[1] flex flex-col gap-4" : "flex flex-col gap-4"}
        >
          {resolvedSections.map((section, i) => {
            const SectionComponent = SECTION_COMPONENTS[section.type];
            const key = generateSectionKey(section, i);
            if (!SectionComponent) {
              throw new Error(`unknown section type: "${section.type}"`);
            }
            return (
              <SectionErrorBoundary key={key} sectionKey={key}>
                <SectionComponent {...section} />
              </SectionErrorBoundary>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ModalRendererEventDriven — event-driven variant
// ---------------------------------------------------------------------------

/**
 * Inner variant: uses event-driven `peblor-modal` events to control open state.
 * Used when `show` is not provided externally. Starts hidden; opens on `modalOpen` event.
 */
function ModalRendererEventDriven({
  id,
  title,
  effects,
  resolvedSections,
  behavior,
  transition,
  motion,
  onOverlayClick,
  overlayClassName,
  overlayStyle,
  dialogClassName,
}: Omit<ModalRendererProps, "show">) {
  const open = useModalEventListener(id, false);

  const content = (
    <ModalContent
      id={id}
      title={title}
      effects={effects}
      resolvedSections={resolvedSections}
      behavior={behavior}
      modalActive={open}
      onOverlayClick={onOverlayClick}
      overlayClassName={overlayClassName}
      overlayStyle={overlayStyle}
      dialogClassName={dialogClassName}
    />
  );

  return (
    <ModalAnimationWrapper
      modalKey={id}
      show={open}
      transition={transition}
      motion={motion}
      zIndex={behavior?.zIndex}
    >
      {content}
    </ModalAnimationWrapper>
  );
}

// ---------------------------------------------------------------------------
// ModalRenderer — public export
// ---------------------------------------------------------------------------

/**
 * Renders a modal: overlay + dialog panel with peblor sections inside.
 * Props come from getModalProps(id, options) (JSON).
 *
 * - When `show` is passed: enter/exit are driven by that boolean via Framer Motion.
 * - When `eventDriven` is true and `show` is omitted: modal listens to `peblor-modal`
 *   events (modalOpen/modalClose/modalToggle) targeting its `id` and manages open state
 *   internally. Starts hidden; opens on `modalOpen` event.
 * - Otherwise: modal is always visible when rendered (e.g. unlock modal shown via URL param).
 *
 * The `behavior` field (from the modal JSON) drives size, position, backdrop, escape/backdrop-click
 * handling, focus-trap, z-index, and aria-label. All fields are optional; defaults preserve
 * prior hardcoded behavior. Legacy callers may pass `overlayClassName`/`dialogClassName` to
 * fully bypass behavior-derived styles (backward-compatible).
 */
export function ModalRenderer({
  id,
  title,
  effects,
  resolvedSections,
  behavior,
  transition,
  motion,
  show,
  eventDriven,
  onOverlayClick,
  overlayClassName,
  overlayStyle,
  dialogClassName,
}: ModalRendererProps) {
  if (show !== undefined) {
    return (
      <ModalAnimationWrapper
        modalKey={id}
        show={show}
        transition={transition}
        motion={motion}
        zIndex={behavior?.zIndex}
      >
        <ModalContent
          id={id}
          title={title}
          effects={effects}
          resolvedSections={resolvedSections}
          behavior={behavior}
          modalActive={show}
          onOverlayClick={onOverlayClick}
          overlayClassName={overlayClassName}
          overlayStyle={overlayStyle}
          dialogClassName={dialogClassName}
        />
      </ModalAnimationWrapper>
    );
  }

  if (eventDriven) {
    return (
      <ModalRendererEventDriven
        id={id}
        title={title}
        effects={effects}
        resolvedSections={resolvedSections}
        behavior={behavior}
        transition={transition}
        motion={motion}
        onOverlayClick={onOverlayClick}
        overlayClassName={overlayClassName}
        overlayStyle={overlayStyle}
        dialogClassName={dialogClassName}
      />
    );
  }

  return (
    <ModalContent
      id={id}
      title={title}
      effects={effects}
      resolvedSections={resolvedSections}
      behavior={behavior}
      modalActive
      onOverlayClick={onOverlayClick}
      overlayClassName={overlayClassName}
      overlayStyle={overlayStyle}
      dialogClassName={dialogClassName}
    />
  );
}

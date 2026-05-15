"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ModalProps } from "@pb/core/modal";
import { SECTION_COMPONENTS } from "@/peblor/section";
import { generateSectionKey } from "@pb/core/keys";
import { SectionErrorBoundary } from "./SectionErrorBoundary";
import { ModalAnimationWrapper } from "@/peblor/integrations/framer-motion/modal-wrapper";
import { SectionGlassEffect } from "@/peblor/section/stack/SectionGlassEffect";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";
import { resolveThemeValueDeep } from "@/peblor/theme/theme-string";

const TABBABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getTabbableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
  );
}

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
  /** Optional className for the overlay (backdrop). */
  overlayClassName?: string;
  /** Optional inline style for the overlay (e.g. animated backdropFilter). */
  overlayStyle?: CSSProperties;
  /** Optional className for the dialog container. */
  dialogClassName?: string;
};

function ModalContent({
  id,
  title,
  effects,
  resolvedSections,
  modalActive,
  onOverlayClick,
  overlayClassName,
  overlayStyle,
  dialogClassName,
}: Omit<ModalRendererProps, "show"> & { modalActive: boolean }) {
  const themeMode = usePeblorThemeMode();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const dialogContainerRef = useRef<HTMLDivElement | null>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  const assignOverlayRef = useCallback((el: HTMLDivElement | null) => {
    dialogContainerRef.current = el;
  }, []);

  useEffect(() => {
    if (!modalActive) return;

    const prev = document.activeElement;
    if (prev instanceof HTMLElement) prevFocusRef.current = prev;

    const frameId = requestAnimationFrame(() => {
      const root = dialogContainerRef.current;
      if (!root) return;
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

      if (e.key === "Escape" && onOverlayClick) {
        e.preventDefault();
        e.stopPropagation();
        onOverlayClick();
        return;
      }

      if (e.key !== "Tab") return;
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
    [modalActive, onOverlayClick]
  );

  const resolvedEffects = resolveThemeValueDeep(effects, themeMode) as typeof effects;
  const hasGlassEffect = (resolvedEffects ?? []).some((effect) => effect.type === "glass");
  const resolvedDialogClassName =
    dialogClassName ??
    (hasGlassEffect
      ? "relative w-full max-w-[min(theme(maxWidth.sm),calc(100vw-2rem))] md:max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-transparent shadow-xl border border-white/15 p-6"
      : "w-full max-w-[min(theme(maxWidth.sm),calc(100vw-2rem))] md:max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-background shadow-xl border border-border p-6");

  return (
    <div
      ref={assignOverlayRef}
      id={id}
      className={
        overlayClassName ??
        "fixed inset-0 z-[var(--pb-z-modal)] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      }
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      aria-labelledby={title ? `${id}-title` : undefined}
      onClick={onOverlayClick}
      onKeyDown={handleDialogKeyDown}
    >
      <div
        ref={dialogRef}
        className={resolvedDialogClassName}
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

/**
 * Inner variant: uses event-driven `peblor-modal` events to control open state.
 * Used when `show` is not provided externally. Starts hidden; opens on `modalOpen` event.
 */
function ModalRendererEventDriven({
  id,
  title,
  effects,
  resolvedSections,
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
      modalActive={open}
      onOverlayClick={onOverlayClick}
      overlayClassName={overlayClassName}
      overlayStyle={overlayStyle}
      dialogClassName={dialogClassName}
    />
  );

  return (
    <ModalAnimationWrapper modalKey={id} show={open} transition={transition} motion={motion}>
      {content}
    </ModalAnimationWrapper>
  );
}

/**
 * Renders a modal: overlay + centered dialog with peblor sections inside.
 * Props come from getModalProps(id, options) (JSON).
 * - When `show` is passed: enter/exit are driven by that boolean via Framer Motion.
 * - When `eventDriven` is true and `show` is omitted: modal listens to `peblor-modal`
 *   events (modalOpen/modalClose/modalToggle) targeting its `id` and manages open state
 *   internally. Starts hidden; opens on `modalOpen` event.
 * - Otherwise: modal is always visible when rendered (e.g. unlock modal shown via URL param).
 */
export function ModalRenderer({
  id,
  title,
  effects,
  resolvedSections,
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
      <ModalAnimationWrapper modalKey={id} show={show} transition={transition} motion={motion}>
        <ModalContent
          id={id}
          title={title}
          effects={effects}
          resolvedSections={resolvedSections}
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
      modalActive
      onOverlayClick={onOverlayClick}
      overlayClassName={overlayClassName}
      overlayStyle={overlayStyle}
      dialogClassName={dialogClassName}
    />
  );
}

"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { ModalProps } from "@pb/core/modal";
import { DeviceTypeProvider as RuntimeDeviceTypeProvider } from "@pb/runtime-react/core/providers/device-type-provider";

const ModalRenderer = dynamic(() =>
  import("@pb/runtime-react/modal").then((mod) => mod.ModalRenderer)
);

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

type Props = {
  children: React.ReactNode;
  unlockModalProps: ModalProps | null;
  hideChildrenWhenModalOpen?: boolean;
  closeOnOverlayClick?: boolean;
};

/**
 * Renders page content with an optional unlock modal overlay.
 * Modal props (including transition) come from getModalProps; no hardcoded modal logic.
 */
export function WithUnlockModal({
  children,
  unlockModalProps,
  hideChildrenWhenModalOpen = false,
  closeOnOverlayClick = true,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const modalOpen = Boolean(unlockModalProps);
  const hideChildren = modalOpen && hideChildrenWhenModalOpen;
  const [overlayEntered, setOverlayEntered] = useState(false);

  useEffect(() => {
    if (!modalOpen) return;

    let enterFrameId = 0;
    const resetFrameId = window.requestAnimationFrame(() => {
      setOverlayEntered(false);
      enterFrameId = window.requestAnimationFrame(() => setOverlayEntered(true));
    });

    return () => {
      window.cancelAnimationFrame(resetFrameId);
      window.cancelAnimationFrame(enterFrameId);
    };
  }, [modalOpen]);
  const modalId = unlockModalProps?.id;

  useEffect(() => {
    if (!modalId || !overlayEntered) return;

    const frameId = window.requestAnimationFrame(() => {
      const root = document.getElementById(modalId);
      if (!(root instanceof HTMLElement)) return;
      const priorityTarget = getPriorityFocusTarget(root);
      if (priorityTarget) {
        priorityTarget.focus({ preventScroll: true });
        return;
      }
      const tabbable = getTabbableElements(root);
      (tabbable[0] ?? root).focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [modalId, overlayEntered]);

  const handleOverlayClick = useCallback(() => {
    setOverlayEntered(false);
    startTransition(() => {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
        return;
      }
      const params = new URLSearchParams(window.location.search);
      params.delete("unlock");
      params.delete("unlock_redirect");
      params.delete("unlock_preview");
      const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(nextUrl);
    });
  }, [pathname, router, startTransition]);

  return (
    <>
      {!hideChildren && children}
      {unlockModalProps && (
        <RuntimeDeviceTypeProvider>
          <ModalRenderer
            {...unlockModalProps}
            show
            overlayClassName={`fixed inset-0 z-[var(--pb-z-modal)] flex items-center justify-center p-4 transition-[opacity,background-color] duration-400 ease-out ${
              overlayEntered
                ? hideChildren
                  ? "bg-background/72 opacity-100"
                  : "bg-background/52 opacity-100"
                : "opacity-0"
            }`}
            onOverlayClick={closeOnOverlayClick ? handleOverlayClick : undefined}
            dialogClassName="w-[min(92vw,28rem)] sm:w-[min(86vw,30rem)] max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-background p-5 shadow-xl sm:p-6"
          />
        </RuntimeDeviceTypeProvider>
      )}
    </>
  );
}

"use client";

import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import type { ModalProps } from "@pb/core/modal";
import { ServerBreakpointProvider } from "@pb/runtime-react/core/providers/device-type-provider";

// Dynamic import so ModalRenderer (which statically imports SECTION_COMPONENTS +
// ModalAnimationWrapper) is not part of the eager first-load bundle. Modals are
// always opened via JavaScript events, so they are never needed before JS loads.
const ModalRenderer = dynamic(() =>
  import("@/peblor/ModalRenderer").then((m) => m.ModalRenderer)
) as ComponentType<
  ModalProps & {
    eventDriven?: boolean;
    overlayClassName?: string;
    dialogClassName?: string;
  }
>;

// Page-level modal defaults (lighter backdrop than the standalone ModalRenderer default).
// Applied only when the modal JSON does NOT include a `behavior` block so that existing
// page-level modals keep their current look without any JSON changes.
const PAGE_MODAL_OVERLAY_CLASS =
  "fixed inset-0 z-[var(--pb-z-modal)] flex items-center justify-center p-4 bg-background/52 backdrop-blur-sm";
const PAGE_MODAL_DIALOG_CLASS =
  "w-[min(92vw,28rem)] sm:w-[min(86vw,30rem)] max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-background p-5 shadow-xl sm:p-6";

type Props = {
  modals: ModalProps[];
  serverIsMobile?: boolean;
};

/**
 * Mounts event-driven ModalRenderers for page-level modals declared in the page JSON
 * via the `modals` array. Each modal listens for `peblor-modal` CustomEvents
 * (modalOpen/modalClose/modalToggle) targeting its id.
 *
 * When a modal's JSON includes a `behavior` block (gap 2.4), behavior-derived styles are used
 * and the legacy class overrides are omitted. When `behavior` is absent, the page-level
 * defaults (lighter backdrop) are applied via overlayClassName/dialogClassName so existing
 * modals keep their current appearance without any JSON changes.
 */
export function PageModalsIsland({ modals, serverIsMobile }: Props) {
  if (modals.length === 0) return null;
  return (
    <ServerBreakpointProvider isMobile={serverIsMobile ?? false}>
      {modals.map((modal) => {
        // When behavior is declared in JSON, let ModalRenderer derive styles from it.
        // When absent, fall back to the page-level hardcoded class strings (backward compat).
        const hasBehavior = modal.behavior !== undefined;
        return (
          <ModalRenderer
            key={modal.id}
            {...modal}
            eventDriven
            overlayClassName={hasBehavior ? undefined : PAGE_MODAL_OVERLAY_CLASS}
            dialogClassName={hasBehavior ? undefined : PAGE_MODAL_DIALOG_CLASS}
          />
        );
      })}
    </ServerBreakpointProvider>
  );
}

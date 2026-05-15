import type { ModalProps } from "@pb/core/modal";
import { WithUnlockModal } from "@/core/ui/WithUnlockModal";
import { serializeJsonLd } from "@/core/lib/serialize-json-ld";

type Props = {
  unlockModalProps: ModalProps | null;
  hideChildrenWhenModalOpen?: boolean;
  closeOnOverlayClick?: boolean;
  unlockPreview?: string | null;
  showPreviewBackground?: boolean;
  solidBackdropClassName?: string;
  structuredData?: unknown;
  children: React.ReactNode;
};

export function UnlockPageShell({
  unlockModalProps,
  hideChildrenWhenModalOpen = false,
  closeOnOverlayClick = true,
  unlockPreview,
  showPreviewBackground = false,
  solidBackdropClassName,
  structuredData,
  children,
}: Props) {
  return (
    <div className="relative">
      {showPreviewBackground && unlockPreview && (
        <>
          <div
            className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${unlockPreview}")` }}
            aria-hidden
          />
          <div className="fixed inset-0 -z-10 bg-background/60" aria-hidden />
        </>
      )}
      {solidBackdropClassName ? <div className={solidBackdropClassName} aria-hidden /> : null}
      <WithUnlockModal
        unlockModalProps={unlockModalProps}
        hideChildrenWhenModalOpen={hideChildrenWhenModalOpen}
        closeOnOverlayClick={closeOnOverlayClick}
      >
        {structuredData != null && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
          />
        )}
        {children}
      </WithUnlockModal>
    </div>
  );
}

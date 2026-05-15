import type { VideoErrorKind } from "./use-element-video-source";

const MESSAGES: Record<VideoErrorKind, { headline: string; detail: string }> = {
  unsupported: {
    headline: "Video not supported",
    detail: "Your browser can't play this format. Try Chrome, Firefox, or Edge.",
  },
  fatal: {
    headline: "Video failed to load",
    detail: "There was a problem loading this video. Try refreshing the page.",
  },
};

export function ElementVideoErrorOverlay({ errorKind }: { errorKind: VideoErrorKind }) {
  const { headline, detail } = MESSAGES[errorKind];

  return (
    <span
      className="pointer-events-none absolute inset-0 flex items-start justify-start"
      style={{ zIndex: 2 }}
      role="alert"
      aria-live="polite"
    >
      <span
        className="m-3 px-3 py-2 rounded-lg text-xs leading-snug max-w-[260px]"
        style={{
          color: "rgba(255,255,255,0.85)",
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <span className="block font-medium">{headline}</span>
        <span className="block opacity-75 mt-0.5">{detail}</span>
      </span>
    </span>
  );
}

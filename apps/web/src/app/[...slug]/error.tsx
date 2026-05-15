"use client";

import { useEffect } from "react";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SlugError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-sm uppercase tracking-[0.14em] text-foreground/60">
        Unable to load this page
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full border border-foreground/25 px-4 py-2 text-sm transition hover:border-foreground/60"
      >
        Try again
      </button>
    </div>
  );
}

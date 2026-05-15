import type { ReactNode } from "react";

type Props = {
  /** Typically `DevWorkbenchNav` with reset handlers. */
  nav?: ReactNode;
  children: ReactNode;
};

/** Outer layout for `/dev/*` tools — matches element body dev (max width, padding, background). */
export function DevWorkbenchPageShell({ nav, children }: Props) {
  return (
    <main className="min-h-screen overflow-x-auto bg-background text-foreground">
      <div className="mx-auto w-full min-w-[768px] max-w-[1520px] px-6 py-8 md:px-10 md:py-10 lg:px-14 lg:py-12">
        {nav}
        {children}
      </div>
    </main>
  );
}

import { UniversalPeblorShell } from "./universal-peblor-shell";

/**
 * Universal peblor layout: provides a scroll container with non-static
 * position so Framer Motion useScroll (e.g. useSectionScrollProgress) can
 * compute scroll offset correctly.
 *
 * Previously each section (work, research, teaching) had its own layout.
 * Those are replaced by this single catch-all layout. Page-level scroll
 * behaviors (lock, smooth scroll) are controlled via page JSON — see the
 * peblor scroll behavior task.
 *
 * MotionConfig and PeblorRuntimeEffects are intentionally absent here.
 * They mount inside ClientPageRuntimeIsland, which the server page conditionally
 * renders only for pages that have client blocks, page runtime, or a forced theme.
 */
export default function UniversalPeblorLayout({ children }: { children: React.ReactNode }) {
  return <UniversalPeblorShell>{children}</UniversalPeblorShell>;
}

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
 * **MotionConfig split:**
 * MotionConfig and PeblorRuntimeEffects are intentionally absent here.
 * They mount inside ClientPageRuntimeIsland, which the server page conditionally
 * renders only for pages that have client blocks, page runtime, or a forced theme.
 *
 * Why this split:
 * - MotionConfig must be mounted inside the scroll container (not above it) so that
 *   Framer Motion's `useScroll()` correctly measures scroll offsets relative to the
 *   scroll container, not the viewport.
 * - The scroll container (`UniversalPeblorShell`) is a server layout component.
 *   MotionConfig is a client component. If MotionConfig wrapped the scroll container,
 *   the entire layout would be client-rendered, defeating SSR for the shell.
 * - By keeping the scroll container as a server layout and mounting MotionConfig
 *   only on pages that need it (in ClientPageRuntimeIsland), we get SSR for the
 *   scroll shell and client-side motion features only where needed.
 */
export default function UniversalPeblorLayout({ children }: { children: React.ReactNode }) {
  return <UniversalPeblorShell>{children}</UniversalPeblorShell>;
}

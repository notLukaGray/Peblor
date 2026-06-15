"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

type NavigationContextValue = {
  isNavigating: boolean;
  navigate: (url: string) => void;
  prefetch: (url: string) => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Track whether we've mounted — skip the initial render so we don't steal focus
  // on first page load.
  const isInitialMount = useRef(true);
  // Track the last navigated URL so the focus effect can check for hash fragments.
  const lastNavigateUrl = useRef<string | null>(null);

  const navigate = useCallback(
    (url: string) => {
      lastNavigateUrl.current = url;
      startTransition(() => {
        router.push(url);
      });
    },
    [router, startTransition]
  );

  const prefetch = useCallback(
    (url: string) => {
      router.prefetch(url);
    },
    [router]
  );

  const contextValue = useMemo(
    () => ({ isNavigating: isPending, navigate, prefetch }),
    [isPending, navigate, prefetch]
  );

  // Move focus to the main content area when client-side navigation completes.
  // Violates WCAG SC 2.4.3 (Focus Order) without this: after router.push() the
  // focus stays on the clicked link instead of moving to the new page content.
  //
  // Hash fragment navigations (e.g. /page#section) are exempted — focus should
  // move to the hash target, not the main content wrapper.
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!isPending) {
      // Not a navigation at all — this isPending→false transition came from
      // an unrelated startTransition elsewhere in the tree.  Don't steal focus.
      const lastUrl = lastNavigateUrl.current;
      lastNavigateUrl.current = null;
      if (!lastUrl) return;
      // When the last navigation was a hash-fragment link, skip the main-content
      // focus — the browser handles in-page hash navigation natively.
      if (lastUrl.includes("#")) return;

      const main = document.getElementById("main-content");
      if (main) {
        main.focus();
        // Scroll to top — the browser may preserve scroll position across navigations.
        main.scrollIntoView({ block: "start" });
      }
    }
  }, [isPending]);

  return <NavigationContext.Provider value={contextValue}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return ctx;
}

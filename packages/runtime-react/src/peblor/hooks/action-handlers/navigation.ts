import type { ActionHandler, ActionHandlerMap } from "./types";
import { resolveAuthoredUrl } from "@pb/runtime-react/core/lib/url-policy";

const handleBack: ActionHandler = (_payload, _ctx) => {
  if (typeof window !== "undefined") window.history.back();
};

const handleNavigate: ActionHandler = (payload, { router }) => {
  const { href, replace } = (payload ?? {}) as { href?: string; replace?: boolean };
  if (!href) return;
  const result = resolveAuthoredUrl(href, "internal");
  if (!result.ok) return;
  if (replace) router.replace(result.url);
  else router.push(result.url);
};

const handleScrollTo: ActionHandler = (payload, { scrollContainerRef, smoothScrollTo }) => {
  const p = (payload ?? {}) as {
    id?: string;
    offset?: number;
    behavior?: ScrollBehavior;
    block?: ScrollLogicalPosition;
  };
  if (p.id) {
    const el = document.getElementById(p.id);
    if (!el) return;
    const scrollContainer = scrollContainerRef?.current;
    if (scrollContainer && smoothScrollTo) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const targetScrollTop = scrollContainer.scrollTop + (elRect.top - containerRect.top);
      smoothScrollTo(targetScrollTop);
    } else {
      el.scrollIntoView({ behavior: p.behavior ?? "smooth", block: p.block ?? "start" });
    }
  } else if (p.offset != null) {
    const scrollContainer = scrollContainerRef?.current;
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: p.offset, behavior: p.behavior ?? "smooth" });
    } else {
      window.scrollTo({ top: p.offset, behavior: p.behavior ?? "smooth" });
    }
  }
};

const handleScrollLock: ActionHandler = () => {
  document.body.style.overflow = "hidden";
};

const handleScrollUnlock: ActionHandler = () => {
  document.body.style.overflow = "";
};

export const NAVIGATION_HANDLERS: ActionHandlerMap = {
  back: handleBack,
  navigate: handleNavigate,
  scrollTo: handleScrollTo,
  scrollLock: handleScrollLock,
  scrollUnlock: handleScrollUnlock,
};

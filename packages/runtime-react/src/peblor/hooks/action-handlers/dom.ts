import type { ActionHandler, ActionHandlerMap } from "./types";
import { resolveAuthoredUrl } from "@pb/runtime-react/core/lib/url-policy";

const handleCopyToClipboard: ActionHandler = (payload) => {
  const { text } = (payload ?? {}) as { text?: string };
  if (text == null) return;
  navigator.clipboard?.writeText(text).catch((err) => {
    console.warn("[pb-runtime-react] Clipboard write failed", err);
  });
};

const handleVibrate: ActionHandler = (payload) => {
  const { pattern = 50 } = (payload ?? {}) as { pattern?: number | number[] };
  navigator.vibrate?.(pattern);
};

const handleSetDocumentTitle: ActionHandler = (payload) => {
  const { title } = (payload ?? {}) as { title?: string };
  if (title == null) return;
  document.title = title;
};

const handleOpenExternalUrl: ActionHandler = (payload) => {
  const { url, target = "_blank" } = (payload ?? {}) as { url?: string; target?: string };
  if (url == null) return;
  const result = resolveAuthoredUrl(url, "external");
  if (!result.ok) return;
  window.open(result.url, target, "noopener,noreferrer");
};

const handleSetCssVariable: ActionHandler = (payload) => {
  const {
    property,
    value: cssValue,
    selector,
  } = (payload ?? {}) as {
    property?: string;
    value?: string;
    selector?: string;
  };
  if (property == null) return;
  const prop = property.startsWith("--") ? property : `--${property}`;
  const el = selector ? document.querySelector(selector) : document.documentElement;
  if (el instanceof HTMLElement) el.style.setProperty(prop, cssValue ?? "");
};

const handleFocusElement: ActionHandler = (payload) => {
  const el = document.getElementById((payload as { id?: string })?.id ?? "");
  el?.focus();
};

const handleBlurElement: ActionHandler = (payload) => {
  const el = document.getElementById((payload as { id?: string })?.id ?? "");
  el?.blur();
};

const handleSetInputValue: ActionHandler = (payload) => {
  const { id, value } = (payload ?? {}) as { id?: string; value?: string };
  if (id == null) return;
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (el && "value" in el) {
    el.value = value ?? "";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
};

const handleDispatchCustomEvent: ActionHandler = (payload) => {
  const { name, detail } = (payload ?? {}) as { name?: string; detail?: unknown };
  if (name == null) return;
  window.dispatchEvent(new CustomEvent(`peblor-custom:${name}`, { detail }));
};

const handleSetUrlParam: ActionHandler = (payload) => {
  const {
    param,
    value: paramValue,
    replace: useReplace = false,
  } = (payload ?? {}) as {
    param?: string;
    value?: string;
    replace?: boolean;
  };
  if (param == null) return;
  const url = new URL(window.location.href);
  url.searchParams.set(param, paramValue ?? "");
  if (useReplace) window.history.replaceState(null, "", url.toString());
  else window.history.pushState(null, "", url.toString());
};

const handleShare: ActionHandler = (payload) => {
  const p = (payload ?? {}) as { title?: string; text?: string; url?: string };
  if (!("share" in navigator)) {
    console.warn("[peblor] Web Share API is not supported in this browser.");
    return;
  }
  const shareData: ShareData = {};
  if (p.title) shareData.title = p.title;
  if (p.text) shareData.text = p.text;
  if (p.url) shareData.url = p.url;
  navigator.share(shareData).catch((err: unknown) => {
    if (err instanceof Error && err.name !== "AbortError") {
      console.warn("[peblor] Share failed:", err);
    }
  });
};

const handleDownloadFile: ActionHandler = (payload) => {
  const { url, filename } = (payload ?? {}) as { url?: string; filename?: string };
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? "";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const DOM_HANDLERS: ActionHandlerMap = {
  copyToClipboard: handleCopyToClipboard,
  vibrate: handleVibrate,
  setDocumentTitle: handleSetDocumentTitle,
  openExternalUrl: handleOpenExternalUrl,
  setCssVariable: handleSetCssVariable,
  focusElement: handleFocusElement,
  blurElement: handleBlurElement,
  setInputValue: handleSetInputValue,
  dispatchCustomEvent: handleDispatchCustomEvent,
  setUrlParam: handleSetUrlParam,
  share: handleShare,
  downloadFile: handleDownloadFile,
};

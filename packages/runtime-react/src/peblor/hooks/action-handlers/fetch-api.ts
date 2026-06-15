import type { ActionHandler, ActionHandlerMap, PeblorAction } from "./types";
import type { JsonValue } from "@pb/contracts/types";
import { setVariable, useVariableStore } from "@/peblor/runtime/peblor-variable-store";
import { resolveVariablePath } from "@pb/contracts/peblor/core/peblor-condition-evaluator";
import { firePeblorAction } from "@/peblor/triggers/core/trigger-event";

const handleFetchApi: ActionHandler = (payload, { abortControllers, debounceTimers }) => {
  const p = (payload ?? {}) as Record<string, unknown>;
  const abortKey = (p.cancelKey as string) ?? (p.url as string);

  const doFetch = (attemptsLeft = ((p.retries as number) ?? 0) + 1) => {
    const vars = useVariableStore.getState().variables as Record<string, JsonValue>;
    const url = (p.url as string).replace(/\{([^}]+)\}/g, (match, path: string) => {
      const val = resolveVariablePath(vars, path.trim());
      return val != null ? String(val) : match;
    });

    abortControllers.get(abortKey)?.abort();
    const controller = new AbortController();
    abortControllers.set(abortKey, controller);
    if (p.statusKey) setVariable(p.statusKey as string, "loading");

    void (async () => {
      try {
        const init: RequestInit = {
          method: (p.method as string) ?? "GET",
          signal: controller.signal,
        };
        const resolvedHeaders = p.headers
          ? Object.fromEntries(
              Object.entries(p.headers as Record<string, string>).map(([k, v]) => [
                k,
                v.replace(/\$var\.([A-Za-z0-9_.$-]+)/g, (m, vp: string) => {
                  const val = resolveVariablePath(vars, vp);
                  return val != null ? String(val) : m;
                }),
              ])
            )
          : undefined;
        if (resolvedHeaders) init.headers = resolvedHeaders;
        if (p.body != null && ((p.method as string) ?? "GET") !== "GET") {
          init.body = JSON.stringify(p.body);
          init.headers = { "Content-Type": "application/json", ...resolvedHeaders };
        }
        const res = await fetch(url, init);
        const contentType = res.headers.get("content-type") ?? "";
        let data: unknown = contentType.includes("application/json")
          ? await res.json()
          : await res.text();
        if (!res.ok)
          throw Object.assign(new Error(`HTTP ${res.status}`), {
            status: res.status,
          });
        if (p.responsePath)
          data = resolveVariablePath({ _: data as JsonValue }, `_.${p.responsePath as string}`);
        setVariable(p.responseKey as string, data as JsonValue);
        if (p.statusKey) setVariable(p.statusKey as string, "loaded");
        if (p.errorKey) setVariable(p.errorKey as string, null);
        if (p.onSuccess) firePeblorAction(p.onSuccess as PeblorAction, "system");
      } catch (err: unknown) {
        if (err instanceof DOMException && (err as DOMException).name === "AbortError") return;
        if (attemptsLeft > 1) {
          setTimeout(() => doFetch(attemptsLeft - 1), (p.retryDelay as number) ?? 1000);
          return;
        }
        if (p.statusKey) setVariable(p.statusKey as string, "error");
        if (p.errorKey)
          setVariable(
            p.errorKey as string,
            {
              status: (Number((err as Record<string, unknown>).status) as JsonValue) || 0,
              message: (err instanceof Error ? err.message : String(err)) as JsonValue,
            } as JsonValue
          );
        if (p.onError) firePeblorAction(p.onError as PeblorAction, "system");
      } finally {
        // Only delete OUR controller — a concurrent call with the same
        // cancelKey may have registered a newer controller. Without this
        // guard, finally would delete the newer call's abort handle.
        if (abortControllers.get(abortKey) === controller) {
          abortControllers.delete(abortKey);
        }
      }
    })();
  };

  if ((p.debounceMs as number) != null) {
    const existing = debounceTimers.get(abortKey);
    if (existing) clearTimeout(existing);
    debounceTimers.set(
      abortKey,
      setTimeout(() => {
        debounceTimers.delete(abortKey);
        doFetch();
      }, p.debounceMs as number)
    );
  } else {
    doFetch();
  }
};

const handleAbortFetch: ActionHandler = (_payload, { abortControllers }) => {
  const { cancelKey } = (_payload ?? {}) as { cancelKey?: string };
  if (cancelKey == null) return;
  abortControllers.get(cancelKey)?.abort();
  abortControllers.delete(cancelKey);
};

export const FETCH_API_HANDLERS: ActionHandlerMap = {
  fetchApi: handleFetchApi,
  abortFetch: handleAbortFetch,
};

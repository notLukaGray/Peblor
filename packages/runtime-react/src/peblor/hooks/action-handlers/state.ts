import type { ActionHandler, ActionHandlerMap } from "./types";
import type { JsonValue } from "@pb/contracts/types";
import {
  setVariable,
  setVariablePath,
  appendToArray,
  removeFromArray,
  mergeVariable,
  deleteVariable,
  useVariableStore,
} from "@/peblor/runtime/peblor-variable-store";
import { resolveVariablePath } from "@pb/contracts/peblor/core/peblor-condition-evaluator";
import { evaluateConditions } from "@pb/contracts/peblor/core/peblor-condition-evaluator";
import { firePeblorAction } from "@/peblor/triggers/core/trigger-event";
import type { PeblorAction } from "@pb/contracts/peblor/core/trigger-action-types";

const handleSetVariable: ActionHandler = (payload) => {
  const { key, value } = (payload ?? {}) as { key: string; value: JsonValue };
  setVariable(key, value);
};

const handleIncrementVariable: ActionHandler = (payload) => {
  const { key, by = 1 } = (payload ?? {}) as { key: string; by?: number };
  const current = useVariableStore.getState().variables[key];
  setVariable(key, (typeof current === "number" ? current : 0) + by);
};

const handleToggleVariable: ActionHandler = (payload) => {
  const { key, values } = (payload ?? {}) as { key: string; values: [JsonValue, JsonValue] };
  const current = useVariableStore.getState().variables[key];
  setVariable(key, Object.is(current, values[0]) ? values[1] : values[0]);
};

const handleDeleteVariable: ActionHandler = (payload) => {
  const { key } = (payload ?? {}) as { key: string };
  deleteVariable(key);
};

function makeReadStorageHandler(storage: "localStorage" | "sessionStorage"): ActionHandler {
  return (payload) => {
    const { key, as } = (payload ?? {}) as { key: string; as?: string };
    try {
      const raw = window[storage].getItem(key);
      setVariable(as ?? key, raw !== null ? (JSON.parse(raw) as JsonValue) : null);
    } catch (err) {
      console.warn(`[peblor] Failed to read ${storage}:`, err);
      setVariable(as ?? key, null);
    }
  };
}

const handleReadLocalStorage = makeReadStorageHandler("localStorage");
const handleReadSessionStorage = makeReadStorageHandler("sessionStorage");

const handleReadUrlParam: ActionHandler = (payload) => {
  const {
    param,
    as,
    parse = "string",
  } = (payload ?? {}) as {
    param: string;
    as?: string;
    parse?: "string" | "number" | "boolean" | "json";
  };
  const raw = new URL(window.location.href).searchParams.get(param);
  const varKey = as ?? param;
  if (raw === null) {
    setVariable(varKey, null);
    return;
  }
  if (parse === "number") {
    setVariable(varKey, Number(raw));
    return;
  }
  if (parse === "boolean") {
    setVariable(varKey, raw === "true" || raw === "1");
    return;
  }
  if (parse === "json") {
    try {
      setVariable(varKey, JSON.parse(raw) as JsonValue);
    } catch (err) {
      console.warn("[peblor] Failed to parse URL param as JSON:", err);
      setVariable(varKey, raw);
    }
    return;
  }
  setVariable(varKey, raw);
};

const handleSetVariablePath: ActionHandler = (payload) => {
  const { path, value } = (payload ?? {}) as { path: string; value: JsonValue };
  setVariablePath(path, value);
};

const handleAppendToArray: ActionHandler = (payload) => {
  const { key, value } = (payload ?? {}) as { key: string; value: JsonValue };
  appendToArray(key, value);
};

const handleRemoveFromArray: ActionHandler = (payload) => {
  const { key, index, where } = (payload ?? {}) as {
    key: string;
    index?: number;
    where?: { path: string; operator: string; value: JsonValue };
  };
  if (where) {
    removeFromArray(key, {
      where: {
        path: where.path,
        test: (v: unknown) =>
          evaluateConditions(
            { variable: "_v", operator: where.operator as never, value: where.value },
            { _v: v as JsonValue }
          ),
      },
    });
  } else {
    removeFromArray(key, { index: index! });
  }
};

const handleMergeVariable: ActionHandler = (payload) => {
  const { key, value } = (payload ?? {}) as { key: string; value: Record<string, JsonValue> };
  mergeVariable(key, value);
};

const handleWaitFor: ActionHandler = (payload, { waitForUnsubscribes }) => {
  const p = payload as {
    conditions?: Array<unknown>;
    logic?: string;
    then?: unknown;
    timeout?: number;
    onTimeout?: unknown;
  };
  const currentVars = useVariableStore.getState().variables;
  if (evaluateConditions(p as never, currentVars)) {
    if (p.then) firePeblorAction(p.then as PeblorAction, "system");
    return;
  }
  void (() =>
    new Promise<void>((resolve) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const unsubscribe = useVariableStore.subscribe(
        (state: { variables: Record<string, JsonValue> }) => state.variables,
        (vars: Record<string, JsonValue>) => {
          if (!evaluateConditions(p as never, vars)) return;
          waitForUnsubscribes.delete(unsubscribe);
          unsubscribe();
          if (timer) clearTimeout(timer);
          if (p.then) firePeblorAction(p.then as PeblorAction, "system");
          resolve();
        }
      );
      waitForUnsubscribes.add(unsubscribe);
      if (p.timeout) {
        timer = setTimeout(() => {
          waitForUnsubscribes.delete(unsubscribe);
          unsubscribe();
          if (p.onTimeout) firePeblorAction(p.onTimeout as PeblorAction, "system");
          resolve();
        }, p.timeout);
      }
    }))();
};

type ComputeFn = (
  p: Record<string, unknown>,
  key: string,
  deps: {
    vars: Record<string, JsonValue>;
    resolveNum: (v: string | number) => number;
    resolveVal: (v: string | number) => JsonValue;
  }
) => void;

const COMPUTE_OPERATIONS: Record<string, ComputeFn> = {
  length: (p, key, { vars }) => {
    const val = resolveVariablePath(vars, p.from as string);
    setVariable(key, Array.isArray(val) ? val.length : typeof val === "string" ? val.length : 0);
  },
  keys: (p, key, { vars }) => {
    const val = resolveVariablePath(vars, p.from as string);
    setVariable(
      key,
      val != null && typeof val === "object" && !Array.isArray(val)
        ? Object.keys(val as object)
        : []
    );
  },
  values: (p, key, { vars }) => {
    const val = resolveVariablePath(vars, p.from as string);
    setVariable(
      key,
      val != null && typeof val === "object" && !Array.isArray(val)
        ? Object.values(val as object)
        : []
    );
  },
  add: (p, key, { resolveNum }) => {
    setVariable(
      key,
      (resolveNum(p.left as string | number) + resolveNum(p.right as string | number)) as never
    );
  },
  subtract: (p, key, { resolveNum }) => {
    setVariable(
      key,
      (resolveNum(p.left as string | number) - resolveNum(p.right as string | number)) as never
    );
  },
  multiply: (p, key, { resolveNum }) => {
    setVariable(
      key,
      (resolveNum(p.left as string | number) * resolveNum(p.right as string | number)) as never
    );
  },
  divide: (p, key, { resolveNum }) => {
    const r = resolveNum(p.right as string | number);
    setVariable(key, (r !== 0 ? resolveNum(p.left as string | number) / r : 0) as never);
  },
  modulo: (p, key, { resolveNum }) => {
    const r = resolveNum(p.right as string | number);
    setVariable(key, (r !== 0 ? resolveNum(p.left as string | number) % r : 0) as never);
  },
  abs: (p, key, { resolveNum }) => {
    setVariable(key, Math.abs(resolveNum(p.from as string)) as never);
  },
  floor: (p, key, { resolveNum }) => {
    setVariable(key, Math.floor(resolveNum(p.from as string)) as never);
  },
  ceil: (p, key, { resolveNum }) => {
    setVariable(key, Math.ceil(resolveNum(p.from as string)) as never);
  },
  round: (p, key, { resolveNum }) => {
    setVariable(key, Math.round(resolveNum(p.from as string)) as never);
  },
  not: (p, key, { vars }) => {
    setVariable(key, !resolveVariablePath(vars, String(p.from)) as never);
  },
  toNumber: (p, key, { resolveNum }) => {
    setVariable(key, resolveNum(p.from as string) as never);
  },
  toString: (
    p: Record<string, unknown>,
    key: string,
    { resolveVal }: { resolveVal: (v: string | number) => JsonValue }
  ) => {
    setVariable(key, String(resolveVal(p.from as string)) as never);
  },
  toBoolean: (p, key, { vars }) => {
    setVariable(key, Boolean(resolveVariablePath(vars, String(p.from))) as never);
  },
  min: (p, key, { vars }) => {
    const arr = resolveVariablePath(vars, p.from as string);
    setVariable(
      key,
      (Array.isArray(arr)
        ? arr.reduce((a: number, b) => Math.min(a, Number(b)), Infinity)
        : 0) as never
    );
  },
  max: (p, key, { vars }) => {
    const arr = resolveVariablePath(vars, p.from as string);
    setVariable(
      key,
      (Array.isArray(arr)
        ? arr.reduce((a: number, b) => Math.max(a, Number(b)), -Infinity)
        : 0) as never
    );
  },
  clamp: (p, key, { resolveNum }) => {
    setVariable(
      key,
      Math.min(p.max as number, Math.max(p.min as number, resolveNum(p.from as string))) as never
    );
  },
  concat: (p, key, { resolveVal }) => {
    setVariable(
      key,
      (p.parts as string[]).map((part) => String(resolveVal(part))).join("") as never
    );
  },
  slice: (p, key, { vars }) => {
    const val = resolveVariablePath(vars, p.from as string);
    if (Array.isArray(val))
      setVariable(key, val.slice(p.start as number, p.end as number) as never);
    else if (typeof val === "string")
      setVariable(key, val.slice(p.start as number, p.end as number) as never);
  },
  join: (p, key, { vars }) => {
    const val = resolveVariablePath(vars, p.from as string);
    setVariable(
      key,
      (Array.isArray(val) ? val.map(String).join((p.separator as string) ?? ",") : "") as never
    );
  },
  split: (p, key, { vars }) => {
    const val = resolveVariablePath(vars, p.from as string);
    setVariable(key, (typeof val === "string" ? val.split(p.by as string) : []) as never);
  },
  arrayIndex: (p, key, { vars }) => {
    const val = resolveVariablePath(vars, p.from as string);
    setVariable(key, (Array.isArray(val) ? (val[p.index as number] ?? null) : null) as never);
  },
  upper: (p, key, { vars }) => {
    const val = resolveVariablePath(vars, p.from as string);
    setVariable(key, typeof val === "string" ? val.toUpperCase() : String(val ?? ""));
  },
  lower: (p, key, { vars }) => {
    const val = resolveVariablePath(vars, p.from as string);
    setVariable(key, typeof val === "string" ? val.toLowerCase() : String(val ?? ""));
  },
  trim: (p, key, { vars }) => {
    const val = resolveVariablePath(vars, p.from as string);
    setVariable(key, typeof val === "string" ? val.trim() : String(val ?? ""));
  },
  replace: (p, key, { vars }) => {
    const val = resolveVariablePath(vars, p.from as string);
    const str = typeof val === "string" ? val : String(val ?? "");
    const search = String(p.search ?? "");
    const replacement = String(p.replacement ?? "");
    if (p.replaceAll) {
      setVariable(key, str.split(search).join(replacement));
    } else {
      setVariable(key, str.replace(search, replacement));
    }
  },
  format: (p, key, { resolveNum }) => {
    const num = resolveNum(p.from as string);
    try {
      const [localeAndStyle, ...optParts] = (p.template as string).split("|");
      const fallbackLocale = typeof navigator !== "undefined" ? navigator.language : "en";
      const [locale = fallbackLocale, style = "decimal"] = (localeAndStyle ?? "en|decimal").split(
        ","
      );
      const opts: Intl.NumberFormatOptions = {
        style: style as Intl.NumberFormatOptions["style"],
      };
      for (const part of optParts) {
        const [k, v] = part.split("=");
        if (k && v) (opts as Record<string, unknown>)[k] = isNaN(Number(v)) ? v : Number(v);
      }
      setVariable(key, new Intl.NumberFormat(locale, opts).format(num) as never);
    } catch (err) {
      console.warn("[peblor] Number format failed:", err);
      setVariable(key, String(num) as never);
    }
  },
};

const handleComputeVariable: ActionHandler = (payload) => {
  const p = (payload ?? {}) as Record<string, unknown>;
  const vars = useVariableStore.getState().variables as Record<string, JsonValue>;
  const resolveNum = (v: string | number): number =>
    typeof v === "number" ? v : Number(resolveVariablePath(vars, v as string) ?? v) || 0;
  const resolveVal = (v: string | number): JsonValue =>
    typeof v === "string" ? (resolveVariablePath(vars, v) ?? v) : v;

  const operation = p.operation as string;
  const key = p.key as string;

  const op = COMPUTE_OPERATIONS[operation];
  if (!op) return;
  op(p, key, { vars, resolveNum, resolveVal });
};

const handleComputeNow: ActionHandler = (payload) => {
  const {
    key,
    format = "timestamp",
    locale,
  } = (payload ?? {}) as {
    key: string;
    format?: string;
    locale?: string;
  };
  if (!key) return;
  const now = new Date();
  let value: JsonValue;
  switch (format) {
    case "iso":
      value = now.toISOString();
      break;
    case "date": {
      const loc = locale ?? (typeof navigator !== "undefined" ? navigator.language : "en");
      value = now.toLocaleDateString(loc);
      break;
    }
    case "time": {
      const loc = locale ?? (typeof navigator !== "undefined" ? navigator.language : "en");
      value = now.toLocaleTimeString(loc);
      break;
    }
    case "datetime": {
      const loc = locale ?? (typeof navigator !== "undefined" ? navigator.language : "en");
      value = now.toLocaleString(loc);
      break;
    }
    default:
      value = now.getTime();
  }
  setVariable(key, value);
};

const handleComputeRandom: ActionHandler = (payload) => {
  const {
    key,
    min = 0,
    max = 1,
    integer = false,
  } = (payload ?? {}) as {
    key: string;
    min?: number;
    max?: number;
    integer?: boolean;
  };
  if (!key) return;
  const raw = min + Math.random() * (max - min);
  setVariable(key, integer ? Math.floor(raw) : raw);
};

export const STATE_HANDLERS: ActionHandlerMap = {
  setVariable: handleSetVariable,
  incrementVariable: handleIncrementVariable,
  toggleVariable: handleToggleVariable,
  deleteVariable: handleDeleteVariable,
  readLocalStorage: handleReadLocalStorage,
  readSessionStorage: handleReadSessionStorage,
  readUrlParam: handleReadUrlParam,
  setVariablePath: handleSetVariablePath,
  appendToArray: handleAppendToArray,
  removeFromArray: handleRemoveFromArray,
  mergeVariable: handleMergeVariable,
  waitFor: handleWaitFor,
  computeVariable: handleComputeVariable,
  computeNow: handleComputeNow,
  computeRandom: handleComputeRandom,
};

import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { z } from "zod";
import { peblorSchema, type Peblor } from "./peblor/core/peblor-schemas";

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);

const VALIDATOR_CACHE_MAX = 8;
const validatorCache = new Map<string, ValidateFunction<Peblor>>();

function getCachedValidator(key: string): ValidateFunction<Peblor> | undefined {
  const validator = validatorCache.get(key);
  if (!validator) return undefined;
  validatorCache.delete(key);
  validatorCache.set(key, validator);
  return validator;
}

function setCachedValidator(key: string, validator: ValidateFunction<Peblor>): void {
  validatorCache.delete(key);
  validatorCache.set(key, validator);
  if (validatorCache.size > VALIDATOR_CACHE_MAX) {
    const lru = validatorCache.keys().next().value;
    if (lru !== undefined) validatorCache.delete(lru);
  }
}

function buildPageValidator(): ValidateFunction<Peblor> {
  const schema = z.toJSONSchema(peblorSchema, {
    target: "draft-2020-12",
    unrepresentable: "any",
    cycles: "ref",
  });
  return ajv.compile(schema) as ValidateFunction<Peblor>;
}

function zodIssuesToStrings(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.map(String).join("/") : "(root)";
    return `${path}: ${issue.message}`;
  });
}

export function validatePageWithAjv(
  input: unknown
): { success: true; data: Peblor } | { success: false; errors: string[] } {
  const cacheKey = "peblor";
  const validator = getCachedValidator(cacheKey) ?? buildPageValidator();
  setCachedValidator(cacheKey, validator);

  if (validator(input)) {
    const zodResult = peblorSchema.safeParse(input);
    if (!zodResult.success) {
      return { success: false, errors: zodIssuesToStrings(zodResult.error) };
    }
    return { success: true, data: zodResult.data };
  }

  const errors = (validator.errors ?? []).map((err) => {
    const path = err.instancePath || "(root)";
    return `${path}: ${err.message ?? "validation error"}`;
  });

  return { success: false, errors };
}

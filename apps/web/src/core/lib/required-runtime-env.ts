let validated = false;

function isMissing(value: string | undefined): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

export function validateRequiredRuntimeEnv(): void {
  if (validated) return;
  validated = true;

  if (process.env.NODE_ENV !== "production") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const missing: string[] = [];
  if (isMissing(process.env.ACCESS_TOKEN_VERSION)) missing.push("ACCESS_TOKEN_VERSION");
  if (isMissing(process.env.RATE_LIMIT_SECRET)) missing.push("RATE_LIMIT_SECRET");

  if (missing.length > 0) {
    throw new Error(
      `Missing required runtime environment variable(s): ${missing.join(", ")}. ` +
        "Set them before starting the production server."
    );
  }
}

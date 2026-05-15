import { validateRequiredRuntimeEnv } from "@/core/lib/required-runtime-env";

export async function register() {
  validateRequiredRuntimeEnv();
}

#!/usr/bin/env npx tsx

// Regenerates the protected-slugs.generated.ts file in the consumer app.
import { regenerateProtectedSlugsFile } from "../apps/web/src/core/lib/generate-protected-slugs";

void regenerateProtectedSlugsFile();

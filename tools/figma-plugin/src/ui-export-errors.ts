import type { ExportResult } from "./types/figma-plugin";

type ExportErrorsPayload = {
  generatedAt: string;
  summary: {
    errors: number;
    warnings: number;
    info: number;
    comments: number;
  };
  errors: string[];
  warnings: string[];
  info: string[];
  trace?: ExportResult["trace"];
};

function stripPrefix(line: string): string {
  return line.replace(/^\[[^\]]+\]\s*/i, "");
}

/**
 * Human-focused error bundle for quick triage (separate from full export payload).
 */
export function buildExportErrorsPayload(
  result: ExportResult,
  errors: string[],
  warningCount: number,
  infoCount: number
): string {
  const info = result.warnings
    .filter((line) => line.startsWith("[info]") || line.startsWith("[docs]"))
    .map(stripPrefix);
  const warnings = result.warnings
    .filter(
      (line) =>
        !line.startsWith("[error]") &&
        !line.startsWith("[info]") &&
        !line.startsWith("[docs]") &&
        !line.startsWith("[proto-interaction]")
    )
    .map(stripPrefix);

  const payload: ExportErrorsPayload = {
    generatedAt: new Date().toISOString(),
    summary: {
      errors: errors.length,
      warnings: warningCount,
      info: infoCount,
      comments: errors.length + warningCount + infoCount,
    },
    errors,
    warnings,
    info,
    ...(result.trace !== undefined ? { trace: result.trace } : {}),
  };
  return JSON.stringify(payload, null, 2);
}

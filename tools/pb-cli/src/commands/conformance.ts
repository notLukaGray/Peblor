import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { CONTRACT_VERSION, type Peblor } from "@pb/contracts";
import { expandPage, resolveAssets } from "@pb/core/resolve";
import type { PeblorDiagnostic } from "@pb/core/validate";
import { isRecord, readJsonFile, resolveInputPath } from "../lib/json-file.js";
import type { CommandIo } from "./types.js";

type PbClient = {
  validate: (value: unknown) => Promise<{ valid: boolean; diagnostics: PeblorDiagnostic[] }>;
};

type ConformanceAssertion = { path: string; equals?: unknown; exists?: boolean };

function getValueAtPath(root: unknown, pathExpr: string): unknown {
  const tokens = pathExpr.match(/([^[.\]]+)|\[(\d+)\]/g) ?? [];
  let current: unknown = root;
  for (const token of tokens) {
    if (current == null) return undefined;
    if (token.startsWith("[")) {
      if (!Array.isArray(current)) return undefined;
      current = current[Number(token.slice(1, -1))];
      continue;
    }
    if (!isRecord(current)) return undefined;
    current = current[token];
  }
  return current;
}

function formatExpected(expected: unknown): string {
  try {
    return JSON.stringify(expected);
  } catch (err) {
    console.warn("[pb-cli] Failed to stringify expected value", err);
    return String(expected);
  }
}

function assertionDiagnostics(
  assertions: ConformanceAssertion[],
  expanded: unknown
): PeblorDiagnostic[] {
  const diagnostics: PeblorDiagnostic[] = [];
  for (const assertion of assertions) {
    const value = getValueAtPath(expanded, assertion.path);
    if (assertion.exists !== undefined && (value !== undefined) !== assertion.exists) {
      diagnostics.push({
        code: "PB_CONFORMANCE_ASSERTION_FAILED",
        severity: "error",
        path: assertion.path,
        message: `Expected exists=${assertion.exists} but got exists=${value !== undefined}.`,
        contractVersion: CONTRACT_VERSION,
      });
    }
    if (assertion.equals !== undefined && !isDeepStrictEqual(value, assertion.equals)) {
      diagnostics.push({
        code: "PB_CONFORMANCE_ASSERTION_FAILED",
        severity: "error",
        path: assertion.path,
        message: `Expected ${formatExpected(assertion.equals)} but got ${formatExpected(value)}.`,
        contractVersion: CONTRACT_VERSION,
      });
    }
  }
  return diagnostics;
}

function expansionDiagnostics(expanded: unknown): PeblorDiagnostic[] {
  if (!isRecord(expanded) || !Array.isArray(expanded.sections)) {
    return [
      {
        code: "PB_CONFORMANCE_PIPELINE_ERROR",
        severity: "error",
        path: "$",
        message: "Expanded output is missing a top-level sections array.",
        contractVersion: CONTRACT_VERSION,
      },
    ];
  }

  const diagnostics: PeblorDiagnostic[] = [];
  for (const [index, section] of expanded.sections.entries()) {
    if (!isRecord(section)) continue;
    const elementOrder = section.elementOrder;
    if (!Array.isArray(elementOrder) || elementOrder.length === 0) continue;
    const resolvedElements = section.elements;
    if (!Array.isArray(resolvedElements) || resolvedElements.length === 0) {
      const sectionId = typeof section.id === "string" ? section.id : `index ${index}`;
      diagnostics.push({
        code: "PB_CONFORMANCE_EXPANSION_INCOMPLETE",
        severity: "error",
        path: `sections[${index}].elements`,
        message: `Section "${sectionId}" has elementOrder (${elementOrder.length}) but no resolved elements after expandPage.`,
        contractVersion: CONTRACT_VERSION,
      });
    }
  }
  return diagnostics;
}

function readAssertions(rawFixture: unknown): ConformanceAssertion[] {
  if (!isRecord(rawFixture) || !isRecord(rawFixture.conformanceExpect)) return [];
  const raw = rawFixture.conformanceExpect.expandedAssertions;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => isRecord(x) && typeof x.path === "string")
    .map((x) => ({
      path: String(x.path),
      ...(x.equals !== undefined ? { equals: x.equals } : {}),
      ...(typeof x.exists === "boolean" ? { exists: x.exists } : {}),
    }));
}

export async function runConformance(
  pb: PbClient,
  io: CommandIo,
  fixturesDir?: string
): Promise<number> {
  const targetDir = resolveInputPath(fixturesDir ?? "packages/contracts/fixtures");
  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    io.printErrorJson({
      command: "conformance",
      contractVersion: CONTRACT_VERSION,
      total: 0,
      passed: 0,
      failed: 1,
      results: [],
      diagnostics: [
        {
          code: "PB_FIXTURE_DIR_MISSING",
          severity: "error",
          path: "$",
          message: `Fixtures directory not found: ${fixturesDir ?? "packages/contracts/fixtures"}`,
          contractVersion: CONTRACT_VERSION,
        },
      ],
    });
    return 2;
  }

  const fixtureFiles = fs
    .readdirSync(targetDir)
    .filter((entry) => entry.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));
  const results: Array<{ file: string; passed: boolean; diagnostics: PeblorDiagnostic[] }> = [];

  for (const fileName of fixtureFiles) {
    const relativePath = path.relative(process.cwd(), path.join(targetDir, fileName));
    const read = readJsonFile(relativePath);
    if (!read.ok) {
      results.push({
        file: relativePath,
        passed: false,
        diagnostics: [
          {
            code: "PB_FIXTURE_READ_ERROR",
            severity: "error",
            path: "$",
            message: "error" in read ? read.error : "Failed to read fixture",
            contractVersion: CONTRACT_VERSION,
          },
        ],
      });
      continue;
    }

    const validation = await pb.validate(read.value);
    const diagnostics = [...validation.diagnostics];
    if (validation.valid) {
      try {
        const pageInput = read.value as Peblor;
        const expanded = expandPage(pageInput);
        diagnostics.push(...expansionDiagnostics(expanded));
        const resolved = resolveAssets(pageInput);
        if (!resolved || !Array.isArray(resolved.resolvedSections)) {
          diagnostics.push({
            code: "PB_CONFORMANCE_RESOLVE_ERROR",
            severity: "error",
            path: "$",
            message: "resolveAssets output is missing resolvedSections array.",
            contractVersion: CONTRACT_VERSION,
          });
        }
        const assertions = readAssertions(read.value);
        if (assertions.length > 0) diagnostics.push(...assertionDiagnostics(assertions, expanded));
      } catch (error) {
        diagnostics.push({
          code: "PB_CONFORMANCE_PIPELINE_ERROR",
          severity: "error",
          path: "$",
          message: `Pipeline execution failed: ${error instanceof Error ? error.message : String(error)}`,
          contractVersion: CONTRACT_VERSION,
        });
      }
    }

    results.push({
      file: relativePath,
      passed: diagnostics.every((d) => d.severity !== "error"),
      diagnostics,
    });
  }

  const passed = results.filter((r) => r.passed).length;
  const summary = {
    command: "conformance",
    contractVersion: CONTRACT_VERSION,
    fixturesDir: path.relative(process.cwd(), targetDir),
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
  if (passed === results.length) {
    io.printJson(summary);
    return 0;
  }
  io.printErrorJson(summary);
  return 1;
}

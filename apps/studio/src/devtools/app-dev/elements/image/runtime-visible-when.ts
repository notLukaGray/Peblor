import type { VisibleWhenOperator } from "@/app/dev/elements/image/types";

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

const STRING_OPERATORS: Partial<Record<VisibleWhenOperator, (a: unknown, b: unknown) => boolean>> =
  {
    contains: (a, b) => String(a).includes(String(b)),
    startsWith: (a, b) => String(a).startsWith(String(b)),
    equals: (a, b) => String(a) === String(b),
    notEquals: (a, b) => String(a) !== String(b),
  };

const NUMBER_OPERATORS: Partial<Record<VisibleWhenOperator, (a: number, b: number) => boolean>> = {
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b,
};

export function evaluateVisibleWhen(
  currentRaw: unknown,
  expectedRaw: unknown,
  operator: VisibleWhenOperator
): boolean {
  const stringComparator = STRING_OPERATORS[operator];
  if (stringComparator) return stringComparator(currentRaw, expectedRaw);
  const numericComparator = NUMBER_OPERATORS[operator];
  if (!numericComparator) return false;
  const currentNum = asNumber(currentRaw);
  const expectedNum = asNumber(expectedRaw);
  if (currentNum == null || expectedNum == null) return false;
  return numericComparator(currentNum, expectedNum);
}

"use client";

import { useMemo } from "react";

export type Rng = () => number;

const LCG_MOD = 233280;

/** Return a deterministic RNG from a seed (LCG). Use for production or tests. */
export function makeSeededRng(seed: number): Rng {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % LCG_MOD;
    return state / LCG_MOD;
  };
}

/** Pick a random character from charset using rng. */
export function pickScrambleChar(rng: Rng, charset: string): string {
  if (!charset.length) return "";
  const idx = Math.floor(rng() * charset.length);
  return charset[idx] ?? "";
}

/** Shuffle only the letters in text using rng; non-letters and case are preserved. */
export function scrambleStep(text: string, rng: Rng): string {
  const letterInfo: Array<{ index: number; isUpper: boolean }> = [];
  const letters: string[] = [];
  const result = text.split("");

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char && /[a-zA-Z]/.test(char)) {
      letterInfo.push({ index: i, isUpper: char === char.toUpperCase() });
      letters.push(char.toLowerCase());
    }
  }

  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = letters[i];
    if (temp !== undefined && letters[j] !== undefined) {
      letters[i] = letters[j];
      letters[j] = temp;
    }
  }

  letterInfo.forEach(({ index, isUpper }, letterIdx) => {
    const letter = letters[letterIdx];
    if (letter !== undefined && result[index] !== undefined) {
      result[index] = isUpper ? letter.toUpperCase() : letter;
    }
  });

  return result.join("");
}

/** Scramble letters in text. Uses seeded RNG by default; pass rng for determinism in tests. */
export function scrambleText(text: string, seed: number, rng?: Rng): string {
  const next = rng ?? makeSeededRng(seed);
  return scrambleStep(text, next);
}

export function useScrambledText(text: string, id: string): string {
  return useMemo(() => {
    const seed = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return scrambleText(text, seed);
  }, [text, id]);
}

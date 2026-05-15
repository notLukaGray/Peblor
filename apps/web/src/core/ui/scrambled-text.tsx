"use client";

import { useScrambledText } from "@/core/hooks/use-scrambled-text";

export function ScrambledText({ text, id }: { text: string; id: string }) {
  const scrambled = useScrambledText(text, id);
  return <span className="scrambled-glitch">{scrambled}</span>;
}

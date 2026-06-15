"use client";

import { LazyMotion } from "framer-motion";

const loadFeatures = () => import("./motion-features").then((m) => m.default);

export function MotionFeatureProvider({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={loadFeatures}>{children}</LazyMotion>;
}

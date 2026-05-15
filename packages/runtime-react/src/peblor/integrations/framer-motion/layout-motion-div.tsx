"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";

/**
 * A `motion.div` with `layout` always enabled.
 * Use inside containers (e.g. ElementModuleGroup) so that sibling elements
 * smoothly reflow when one of them changes dimensions via a gesture animation.
 * Kept inside the FM integration boundary — nothing outside this folder
 * should import from framer-motion directly.
 */
export function LayoutMotionDiv({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <motion.div layout className={className} style={{ overflow: "visible", ...style }}>
      {children}
    </motion.div>
  );
}

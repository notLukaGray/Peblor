"use client";

import React from "react";
import { Reorder, useDragControls } from "framer-motion";

export { useDragControls };

type ReorderGroupProps = {
  axis?: "x" | "y";
  values: string[];
  onReorder: (newOrder: string[]) => void;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

export function ReorderGroup({
  axis = "y",
  values,
  onReorder,
  style,
  children,
}: ReorderGroupProps) {
  return (
    <Reorder.Group as="div" axis={axis} values={values} onReorder={onReorder} style={style}>
      {children}
    </Reorder.Group>
  );
}

type ReorderItemProps = {
  value: string;
  drag?: boolean;
  dragBehavior?: "elasticSnap" | "free" | "none";
  style?: React.CSSProperties;
  children: React.ReactNode;
};

export function ReorderItem({
  value,
  drag = true,
  dragBehavior = "elasticSnap",
  style,
  children,
}: ReorderItemProps) {
  const elastic = dragBehavior === "elasticSnap" ? 0.2 : undefined;
  const momentum = dragBehavior === "elasticSnap" ? false : undefined;
  return (
    <Reorder.Item
      as="div"
      value={value}
      drag={drag}
      dragElastic={elastic}
      dragMomentum={momentum}
      style={style}
    >
      {children}
    </Reorder.Item>
  );
}

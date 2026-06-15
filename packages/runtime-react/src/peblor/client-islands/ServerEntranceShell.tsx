"use client";

import { useState, useEffect, type ReactNode } from "react";
import type { ElementEntranceWrapperProps } from "@/peblor/elements/Shared/ElementEntranceWrapper";

type Props = ElementEntranceWrapperProps & { children: ReactNode };

let cachedWrapper: React.ComponentType<ElementEntranceWrapperProps> | null = null;
let pendingImport: Promise<void> | null = null;

export function ServerEntranceShell({ wrapperStyle, children, ...rest }: Props) {
  const [EntranceWrapper, setEntranceWrapper] =
    useState<React.ComponentType<ElementEntranceWrapperProps> | null>(() => cachedWrapper);

  useEffect(() => {
    if (EntranceWrapper) return;
    if (pendingImport) return; // Another instance already started the import

    pendingImport = import("@/peblor/elements/Shared/ElementEntranceWrapper")
      .then((m) => {
        cachedWrapper = m.ElementEntranceWrapper;
        setEntranceWrapper(() => m.ElementEntranceWrapper);
      })
      .finally(() => {
        pendingImport = null;
      });
  }, [EntranceWrapper]);

  if (!EntranceWrapper) {
    return <div style={wrapperStyle}>{children}</div>;
  }

  return (
    <EntranceWrapper wrapperStyle={wrapperStyle} {...rest}>
      {children}
    </EntranceWrapper>
  );
}

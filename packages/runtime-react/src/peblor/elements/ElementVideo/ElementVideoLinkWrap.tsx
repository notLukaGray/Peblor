"use client";

import { TransitionLink } from "../Shared/TransitionLink";
import type { ReactNode } from "react";

export type ElementVideoLinkWrapProps = {
  isLinkable: boolean;
  resolvedHref: string | null;
  isInternal: boolean;
  target?: "_self" | "_blank" | "_parent" | "_top";
  rel?: string;
  children: ReactNode;
};

/** Wraps content in Link, external <a>, or fragment based on link resolution. */
export function ElementVideoLinkWrap({
  isLinkable,
  resolvedHref,
  isInternal,
  target,
  rel,
  children,
}: ElementVideoLinkWrapProps) {
  if (!isLinkable || !resolvedHref) return <>{children}</>;
  if (isInternal) {
    return (
      <TransitionLink href={resolvedHref} className="block w-full h-full" target={target} rel={rel}>
        {children}
      </TransitionLink>
    );
  }
  return (
    <a
      href={resolvedHref}
      target={target ?? "_blank"}
      rel={rel ?? "noopener noreferrer"}
      className="block w-full h-full"
    >
      {children}
    </a>
  );
}

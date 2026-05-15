"use client";

import { useNavigation } from "@pb/runtime-react/core/navigation-context";
import type { ReactNode } from "react";

type TransitionLinkTarget = string;

type Props = {
  href: TransitionLinkTarget;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  children?: ReactNode;
  [key: string]: unknown;
};

export function TransitionLink({ href, onClick, children, ...rest }: Props) {
  const { navigate, isNavigating } = useNavigation();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);
    if (e.defaultPrevented) return;

    if (e.metaKey || e.ctrlKey || e.button !== 0) return;
    if (href.startsWith("http") || href.startsWith("//")) return;

    e.preventDefault();
    navigate(href);
  };

  return (
    <a href={href} onClick={handleClick} data-pending={isNavigating ? "" : undefined} {...rest}>
      {children}
    </a>
  );
}

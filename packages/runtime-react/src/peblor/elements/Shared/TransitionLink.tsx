"use client";

import { forwardRef } from "react";
import Link from "next/link";
import { useNavigation } from "@pb/runtime-react/core/navigation-context";

type Props = React.ComponentProps<typeof Link>;

export const TransitionLink = forwardRef<HTMLAnchorElement, Props>(
  ({ href, onClick, children, ...rest }, ref) => {
    const { navigate, isNavigating } = useNavigation();

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (onClick) onClick(e);
      if (e.defaultPrevented) return;

      const target = href as string;
      if (!target) return;

      if (e.metaKey || e.ctrlKey || e.button !== 0) return;
      if (target.startsWith("http") || target.startsWith("//")) return;

      e.preventDefault();
      navigate(target);
    };

    return (
      <Link
        ref={ref}
        href={href}
        onClick={handleClick}
        data-pending={isNavigating ? "" : undefined}
        {...rest}
      >
        {children}
      </Link>
    );
  }
);
TransitionLink.displayName = "TransitionLink";

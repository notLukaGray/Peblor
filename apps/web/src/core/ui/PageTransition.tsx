"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type PageTransitionVariant = "fade" | "none";

type PageTransitionProps = {
  variant?: PageTransitionVariant;
  children: React.ReactNode;
};

export function PageTransition({ variant = "fade", children }: PageTransitionProps) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      setShouldAnimate(true);
      prevPathname.current = pathname;
    }
  }, [pathname]);

  if (variant === "none") return <>{children}</>;

  return (
    <div key={pathname} className={shouldAnimate ? "animate-page-fade-in" : ""}>
      {children}
    </div>
  );
}

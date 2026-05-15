"use client";

import { useEffect, useRef, useCallback } from "react";

type UseProjectNavigationOptions = {
  totalProjects: number;
  onNavigate: (direction: "next" | "prev") => void;
};

export function useProjectNavigation({
  totalProjects: _totalProjects,
  onNavigate,
}: UseProjectNavigationOptions) {
  const scrollLockRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const navigateProject = useCallback(
    (direction: "next" | "prev") => {
      if (scrollLockRef.current) return;
      scrollLockRef.current = true;
      onNavigate(direction);
      setTimeout(() => {
        scrollLockRef.current = false;
      }, 150);
    },
    [onNavigate]
  );

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY;
      if (delta > 0) {
        navigateProject("next");
      } else {
        navigateProject("prev");
      }
    };

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [navigateProject]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        if (touch) {
          touchStartRef.current = { x: touch.clientX, y: touch.clientY };
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || e.changedTouches.length === 0) {
        return;
      }

      const touch = e.changedTouches[0];
      if (!touch) return;

      const touchEnd = { x: touch.clientX, y: touch.clientY };
      const deltaX = touchEnd.x - touchStartRef.current.x;
      const deltaY = touchEnd.y - touchStartRef.current.y;
      const minSwipeDistance = 50;
      const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX);

      if (isVerticalSwipe && Math.abs(deltaY) > minSwipeDistance) {
        e.preventDefault();
        if (deltaY > 0) navigateProject("prev");
        else navigateProject("next");
      }

      touchStartRef.current = null;
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [navigateProject]);
}

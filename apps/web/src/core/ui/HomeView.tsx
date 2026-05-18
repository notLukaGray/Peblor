"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TransitionLink } from "@/core/ui/TransitionLink";
import Image from "next/image";
import { ScrambledText } from "@/core/ui/scrambled-text";
import { useProjectNavigation } from "@/core/hooks/use-project-navigation";
import { useAfterLcp } from "@/core/hooks/use-after-lcp";
import {
  wrapIndex,
  getHeroCarouselOpacity,
  getProjectUrl,
  getCarouselPlaceholderBg,
  resolveHomeMediaUrl,
} from "@/core/lib/home/home-utils";
import type { HeroProject } from "@/core/lib/globals";

type HomeViewProps = {
  heroProjects: HeroProject[];
};

/** Vitest-only: counts `HomeHeroCarouselSlot` body runs (memo bailouts are excluded). */
function bumpHomeCarouselSlotVitestRenderProbe(): void {
  if (typeof process === "undefined" || process.env.VITEST !== "true") return;
  const g = globalThis as typeof globalThis & {
    __NOTLUKAGRAY_HOME_CAROUSEL_SLOT_RENDERS__?: number;
  };
  g.__NOTLUKAGRAY_HOME_CAROUSEL_SLOT_RENDERS__ =
    (g.__NOTLUKAGRAY_HOME_CAROUSEL_SLOT_RENDERS__ ?? 0) + 1;
}

const CarouselLabel = React.memo(
  ({
    project,
    isDisabled,
    opacity,
  }: {
    project: HeroProject;
    isDisabled: boolean;
    opacity: number;
  }) => {
    return (
      <motion.div
        className="text-sm md:text-base relative px-3 md:px-4 text-white flex items-center gap-2"
        animate={{ opacity }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        whileHover={isDisabled ? {} : { x: 8 }}
      >
        <div className="font-heading font-bold leading-tight whitespace-nowrap">
          {project.isRestricted ? (
            <>
              <ScrambledText text={project.title} id={project.id} /> /{" "}
              <ScrambledText text={project.brand?.name ?? ""} id={`${project.id}-brand`} />
            </>
          ) : (
            `${project.title} / ${project.brand?.name ?? ""}`
          )}
        </div>
      </motion.div>
    );
  }
);

CarouselLabel.displayName = "CarouselLabel";

type HomeHeroCarouselSlotProps = {
  project: HeroProject;
  slotIndex: number;
  activeProjectIndex: number;
  heroCount: number;
  previousY: number | undefined;
  setPreviousPositions: React.Dispatch<React.SetStateAction<Map<string, number>>>;
  onActivateProject: (index: number) => void;
  onHoverProject: (id: string | null) => void;
  scheduleMouseMove: (pos: { x: number; y: number }) => void;
  onHoverLeave: () => void;
  tooltipMouse: { x: number; y: number } | null;
};

/**
 * Memoized carousel ring item (PERF-6). Parent mousemove updates `tooltipMouse` only for the
 * hovered project so other slots bail out instead of re-creating ~4 handlers × 6 each frame.
 */
export const HomeHeroCarouselSlot = React.memo(
  ({
    project,
    slotIndex,
    activeProjectIndex,
    heroCount,
    previousY,
    setPreviousPositions,
    onActivateProject,
    onHoverProject,
    scheduleMouseMove,
    onHoverLeave,
    tooltipMouse,
  }: HomeHeroCarouselSlotProps) => {
    bumpHomeCarouselSlotVitestRenderProbe();

    const originalIndex = wrapIndex(activeProjectIndex + (slotIndex - 3), heroCount);
    const opacity = getHeroCarouselOpacity(slotIndex);
    const isInvisible = slotIndex === 0 || slotIndex === 6;
    const isActive = originalIndex === activeProjectIndex;
    const isDisabled = isInvisible;
    const itemSpacing = 24;
    const yPosition = (slotIndex - 3) * itemSpacing;

    const initialY = previousY !== undefined ? previousY : slotIndex < 3 ? -100 : 100;

    const handleAnimationComplete = useCallback(() => {
      setPreviousPositions((prev) => {
        const newMap = new Map(prev);
        newMap.set(project.id, yPosition);
        return newMap;
      });
    }, [project.id, setPreviousPositions, yPosition]);

    const handleMouseEnter = useCallback(() => {
      onHoverProject(project.id);
    }, [onHoverProject, project.id]);

    const handleMouseMove = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        scheduleMouseMove({ x: e.clientX, y: e.clientY });
      },
      [scheduleMouseMove]
    );

    const handleMouseLeave = useCallback(() => {
      onHoverLeave();
    }, [onHoverLeave]);

    const handleActivateClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onActivateProject(originalIndex);
      },
      [onActivateProject, originalIndex]
    );

    const handleActivateKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        onActivateProject(originalIndex);
      },
      [onActivateProject, originalIndex]
    );

    const content = <CarouselLabel project={project} isDisabled={isDisabled} opacity={opacity} />;

    return (
      <>
        <motion.div
          data-project-id={project.id}
          className="absolute left-1/2 -translate-x-1/2 group whitespace-nowrap"
          initial={{
            y: initialY,
            opacity: isInvisible ? 0 : previousY !== undefined ? opacity : 0,
          }}
          animate={{
            y: yPosition,
            opacity: isInvisible ? 0 : opacity,
          }}
          transition={{
            duration: 0.6,
            ease: "easeInOut",
          }}
          onAnimationComplete={handleAnimationComplete}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          aria-hidden={isInvisible}
        >
          {isDisabled ? (
            <div className="block relative pointer-events-none" aria-hidden="true">
              {content}
            </div>
          ) : isActive ? (
            <TransitionLink
              href={getProjectUrl(project)}
              onClick={(e) => e.stopPropagation()}
              className="block relative group"
            >
              {content}
            </TransitionLink>
          ) : (
            <div
              role="button"
              tabIndex={0}
              aria-label={`Select project ${project.title}`}
              onClick={handleActivateClick}
              onKeyDown={handleActivateKeyDown}
              className="block relative cursor-pointer group"
            >
              {content}
            </div>
          )}
        </motion.div>
        {!isDisabled && tooltipMouse ? (
          <div
            key={`${project.id}-description`}
            data-desc-id={project.id}
            className="fixed pointer-events-none z-50"
            style={{
              left: `${tooltipMouse.x + 12}px`,
              top: `${tooltipMouse.y}px`,
              transform: "translateY(-50%)",
            }}
          >
            <div className="bg-background/90 backdrop-blur-sm border border-border rounded-[0.5rem] p-3 shadow-lg w-max max-w-[200px] md:max-w-[250px]">
              <p className="text-[10px] md:text-xs text-foreground leading-relaxed whitespace-normal wrap-break-word">
                {project.description}
              </p>
            </div>
          </div>
        ) : null}
      </>
    );
  }
);

HomeHeroCarouselSlot.displayName = "HomeHeroCarouselSlot";

export function HomeView({ heroProjects }: HomeViewProps) {
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const [previousPositions, setPreviousPositions] = useState<Map<string, number>>(new Map());
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [videoFailedByProject, setVideoFailedByProject] = useState<Record<string, boolean>>({});
  const [posterFailedByProject, setPosterFailedByProject] = useState<Record<string, boolean>>({});
  const mouseMoveRafRef = useRef<number | null>(null);
  const pendingMousePositionRef = useRef<{ x: number; y: number } | null>(null);
  const activeProject = heroProjects[activeProjectIndex];
  const isAfterLcp = useAfterLcp();

  const scheduleMouseMove = useCallback((pos: { x: number; y: number }) => {
    pendingMousePositionRef.current = pos;
    if (mouseMoveRafRef.current != null) return;
    mouseMoveRafRef.current = requestAnimationFrame(() => {
      mouseMoveRafRef.current = null;
      if (pendingMousePositionRef.current) {
        setMousePosition(pendingMousePositionRef.current);
      }
    });
  }, []);

  const onHoverProject = useCallback((id: string | null) => {
    setHoveredProjectId(id);
  }, []);

  const onHoverLeave = useCallback(() => {
    setHoveredProjectId(null);
    pendingMousePositionRef.current = null;
    setMousePosition(null);
  }, []);

  const onActivateProject = useCallback((index: number) => {
    setActiveProjectIndex(index);
  }, []);

  useProjectNavigation({
    totalProjects: heroProjects.length,
    onNavigate: (direction) => {
      if (direction === "next") {
        setActiveProjectIndex((prev) => (prev + 1 >= heroProjects.length ? 0 : prev + 1));
      } else {
        setActiveProjectIndex((prev) => (prev - 1 < 0 ? heroProjects.length - 1 : prev - 1));
      }
    },
  });

  const videoUrl = useMemo(
    () => resolveHomeMediaUrl(activeProject?.video?.url),
    [activeProject?.video?.url]
  );
  const posterUrl = useMemo(
    () => resolveHomeMediaUrl(activeProject?.video?.poster),
    [activeProject?.video?.poster]
  );
  const activeVideoFailed = activeProject ? videoFailedByProject[activeProject.id] === true : false;
  const activePosterFailed = activeProject
    ? posterFailedByProject[activeProject.id] === true
    : false;
  const shouldAttemptVideo = isAfterLcp && Boolean(videoUrl) && !activeVideoFailed;
  const shouldShowPoster = Boolean(posterUrl) && !activePosterFailed && !shouldAttemptVideo;
  const videoPreload = isAfterLcp ? "metadata" : "none";
  const placeholderBg = getCarouselPlaceholderBg(activeProjectIndex);

  useEffect(() => {
    return () => {
      if (mouseMoveRafRef.current != null) cancelAnimationFrame(mouseMoveRafRef.current);
    };
  }, []);

  if (!activeProject) {
    return null;
  }

  const heroCount = heroProjects.length;

  return (
    <div className="relative h-screen overflow-hidden">
      <div className="fixed inset-0 w-full h-full">
        <div className="fixed inset-0 w-full h-full bg-black">
          {shouldAttemptVideo ? (
            <video
              key={`${activeProject.id}:${videoUrl}`}
              src={videoUrl}
              autoPlay
              loop
              muted
              playsInline
              preload={videoPreload}
              poster={posterUrl}
              disableRemotePlayback
              controlsList="nodownload nofullscreen noremoteplayback"
              className="w-full h-full object-cover transition-opacity duration-1000"
              onError={() =>
                setVideoFailedByProject((prev) => ({
                  ...prev,
                  [activeProject.id]: true,
                }))
              }
            >
              Your browser does not support the video tag.
            </video>
          ) : shouldShowPoster ? (
            <div className="relative w-full h-full">
              <Image
                src={posterUrl as string}
                alt=""
                fill
                priority={activeProjectIndex === 0}
                fetchPriority={activeProjectIndex === 0 ? "high" : "auto"}
                sizes="100vw"
                className="object-cover transition-opacity duration-1000"
                aria-hidden
                onError={() =>
                  setPosterFailedByProject((prev) => ({
                    ...prev,
                    [activeProject.id]: true,
                  }))
                }
              />
            </div>
          ) : (
            <div
              className="w-full h-full transition-colors duration-1000"
              style={{ backgroundColor: placeholderBg }}
            />
          )}
        </div>

        <TransitionLink
          href={getProjectUrl(activeProject)}
          className="absolute inset-0 z-10"
          aria-label={`View ${activeProject.title}`}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("nav") || target.closest("footer")) {
              e.preventDefault();
            }
          }}
        />

        <motion.nav
          aria-label="Featured work carousel"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center justify-center px-4 md:px-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="relative flex flex-col items-center justify-center"
            style={{ height: "fit-content" }}
          >
            {Array.from({ length: 7 }, (_, slotIndex) => {
              const originalIndex = wrapIndex(activeProjectIndex + (slotIndex - 3), heroCount);
              const project = heroProjects[originalIndex];

              if (!project) return null;

              const previousY = previousPositions.get(project.id);
              const tooltipMouse =
                hoveredProjectId === project.id && mousePosition ? mousePosition : null;

              return (
                <HomeHeroCarouselSlot
                  key={`${project.id}-${slotIndex}`}
                  project={project}
                  slotIndex={slotIndex}
                  activeProjectIndex={activeProjectIndex}
                  heroCount={heroCount}
                  previousY={previousY}
                  setPreviousPositions={setPreviousPositions}
                  onActivateProject={onActivateProject}
                  onHoverProject={onHoverProject}
                  scheduleMouseMove={scheduleMouseMove}
                  onHoverLeave={onHoverLeave}
                  tooltipMouse={tooltipMouse}
                />
              );
            })}
          </div>
        </motion.nav>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { BackgroundTransitionEffect, bgBlock } from "@pb/contracts/types";

const ClientBackgroundTransitionRuntime = dynamic(
  () =>
    import("./ClientBackgroundTransitionRuntime").then((mod) => ({
      default: mod.ClientBackgroundTransitionRuntime,
    })),
  { ssr: false }
);

const SECTION_CLASS =
  "pointer-events-none fixed inset-0 z-[var(--pb-z-base)] min-h-[100dvh] h-[100dvh] bg-black";

function InitialBgPoster({ resolvedBg }: { resolvedBg: bgBlock | null }) {
  if (!resolvedBg) return null;
  if (resolvedBg.type === "backgroundVideo") {
    const poster = (resolvedBg as { poster?: string }).poster;
    if (!poster) return null;
    return (
      <section className={SECTION_CLASS} aria-hidden>
        <Image
          src={poster}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </section>
    );
  }
  if (resolvedBg.type === "backgroundImage") {
    return (
      <section
        className={SECTION_CLASS}
        aria-hidden
        style={{
          backgroundImage: `url(${(resolvedBg as { image: string }).image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
    );
  }
  return null;
}

export function ClientBackgroundTransitionIsland({
  resolvedBg,
  bgDefinitions,
  transitions,
}: {
  resolvedBg: bgBlock | null;
  bgDefinitions?: Record<string, bgBlock>;
  transitions: BackgroundTransitionEffect | BackgroundTransitionEffect[];
}) {
  const [runtimeReady, setRuntimeReady] = useState(false);

  return (
    <>
      {!runtimeReady && <InitialBgPoster resolvedBg={resolvedBg} />}
      <ClientBackgroundTransitionRuntime
        resolvedBg={resolvedBg}
        bgDefinitions={bgDefinitions}
        transitions={transitions}
        onReady={() => setRuntimeReady(true)}
      />
    </>
  );
}

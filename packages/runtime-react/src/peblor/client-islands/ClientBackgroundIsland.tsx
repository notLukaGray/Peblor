"use client";

import Image from "next/image";
import type { bgBlock } from "@pb/contracts/types";
import type { BackgroundVideoProps } from "../background/BackgroundVideo/background-video-types";
import { bgVariableNeedsClient } from "../background/background-variable-client-capability";
import dynamic from "next/dynamic";

const BackgroundVideo = dynamic(
  () => import("../background/BackgroundVideo").then((mod) => ({ default: mod.BackgroundVideo })),
  { ssr: false }
);

const BackgroundVariable = dynamic(
  () =>
    import("../background/BackgroundVariable").then((mod) => ({
      default: mod.BackgroundVariable,
    })),
  { loading: () => null }
);

const SECTION_CLASS =
  "pointer-events-none fixed inset-0 z-[var(--pb-z-base)] min-h-[100dvh] h-[100dvh] bg-black";

type BgVariable = Extract<bgBlock, { type: "backgroundVariable" }>;

export function ClientBackgroundIsland({ bg, priority }: { bg: bgBlock; priority?: boolean }) {
  if (bg.type === "backgroundVideo") {
    const vb = bg as BackgroundVideoProps;
    return (
      <>
        {vb.poster ? (
          <section className={SECTION_CLASS} aria-hidden>
            <Image
              src={vb.poster}
              alt=""
              fill
              priority={priority}
              sizes="100vw"
              className="object-cover object-center"
            />
          </section>
        ) : null}
        <BackgroundVideo {...vb} priority={priority} />
      </>
    );
  }
  if (bg.type === "backgroundVariable" && bgVariableNeedsClient(bg as BgVariable)) {
    return <BackgroundVariable {...(bg as BgVariable)} />;
  }
  return null;
}

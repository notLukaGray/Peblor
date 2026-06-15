"use client";

import { useEffect, useRef, useCallback } from "react";

export type WaveformMode = "bars" | "wave" | "mirror" | "spectrum";

type Props = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  /** Number of frequency bars to render. Default 48. */
  barCount?: number;
  /** Visualization style. Default "bars". */
  mode?: WaveformMode;
  /** Canvas height in px. Default 56. */
  canvasHeight?: number;
  /** Extra className on the outer container. */
  className?: string;
};

/**
 * Map analyser bins to display bars on a log frequency scale (musical octaves)
 * and compensate for the natural bass-heavy 1/f rolloff in music spectra.
 */
function sampleLogFrequencyBands(
  data: Uint8Array,
  barCount: number,
  active: boolean,
  smoothedPeak: number
): { amps: number[]; peak: number } {
  const silent = Array.from({ length: barCount }, () => 0);
  if (!active || data.length === 0) return { amps: silent, peak: smoothedPeak };

  const bufferLength = data.length;
  const minBin = 1; // skip DC offset
  const maxBin = bufferLength - 1;
  const logMin = Math.log(minBin);
  const logSpan = Math.log(maxBin) - logMin;
  const amps: number[] = [];

  for (let i = 0; i < barCount; i++) {
    const t0 = i / barCount;
    const t1 = (i + 1) / barCount;
    const loBin = Math.max(minBin, Math.floor(Math.exp(logMin + logSpan * t0)));
    const hiBin = Math.min(
      bufferLength,
      Math.max(loBin + 1, Math.ceil(Math.exp(logMin + logSpan * t1)))
    );
    const centerBin = (loBin + hiBin - 1) / 2;

    let sum = 0;
    for (let b = loBin; b < hiBin; b++) sum += data[b] ?? 0;
    const avg = sum / Math.max(1, hiBin - loBin);

    // Log-spaced bands + tilt toward highs to counter music's bass-heavy spectrum.
    const barPos = i / Math.max(1, barCount - 1);
    const freqNorm = centerBin / maxBin;
    const compensation = (0.12 + barPos * 2.4) * (0.25 + 0.75 * Math.pow(freqNorm, 0.35));
    amps.push(Math.min(1, (avg / 255) * compensation));
  }

  // Normalize against a smoothed peak so a single noisy frame doesn't flash all bars.
  const rawPeak = Math.max(...amps);
  const MIN_PEAK = 0.07;
  if (rawPeak < MIN_PEAK) return { amps: amps.map(() => 0), peak: smoothedPeak * 0.9 };

  const peak = Math.max(smoothedPeak * 0.82 + rawPeak * 0.18, MIN_PEAK);
  return { amps: amps.map((amp) => Math.pow(amp / peak, 0.68)), peak };
}

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

const ENVELOPE_MS = 1000;
const MIN_Y_SCALE = 0.14;

/**
 * Real-time frequency visualizer using Web Audio API AnalyserNode.
 * Supports four modes: bars, wave, mirror, spectrum.
 * Mounts when the audio element is available; resumes on play.
 * Falls back gracefully if Web Audio API is unavailable.
 */
export function AudioWaveformRuntime({
  audioRef,
  isPlaying,
  barCount = 48,
  mode = "bars",
  canvasHeight = 56,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(false);
  const graphReadyRef = useRef(false);
  const smoothedPeakRef = useRef(0.1);
  const freqDataRef = useRef<Uint8Array | null>(null);
  const envelopeRef = useRef(0);
  const lastAmpsRef = useRef<number[]>([]);
  const lastDrawTimeRef = useRef<number | null>(null);

  // Build the Web Audio graph once, on first play
  const initGraph = useCallback(() => {
    if (mountedRef.current) return;
    const audio = audioRef.current;
    if (!audio || typeof window === "undefined" || !window.AudioContext) return;

    try {
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256; // 128 frequency bins — better mid/high resolution
      analyser.smoothingTimeConstant = 0.78;
      analyser.minDecibels = -85;
      analyser.maxDecibels = -25;
      const source = audioCtx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);

      ctxRef.current = audioCtx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      mountedRef.current = true;
    } catch (err) {
      if ((err as DOMException).name !== "InvalidStateError") {
        console.warn("[pb-runtime-react] AudioContext init failed (browser policy)", err);
      }
    }
  }, [audioRef]);

  // Wire the graph as soon as the audio element exists — avoids routing glitches on first play.
  useEffect(() => {
    initGraph();
  }, [initGraph]);

  // Resume AudioContext when playing (required by Chrome autoplay policy).
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!isPlaying || !ctx) {
      graphReadyRef.current = false;
      return;
    }

    const markReady = () => {
      graphReadyRef.current = true;
      smoothedPeakRef.current = 0.1;
      // Prime analyser buffers while output is still silent.
      const analyser = analyserRef.current;
      const buf = freqDataRef.current;
      if (analyser && buf) {
        for (let i = 0; i < 4; i++) analyser.getByteFrequencyData(buf as Uint8Array<ArrayBuffer>);
      }
    };

    if (ctx.state === "running") {
      markReady();
      return;
    }

    void ctx
      .resume()
      .then(markReady)
      .catch(() => {
        graphReadyRef.current = false;
      });
  }, [isPlaying]);

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const COUNT = barCount;
    const GAP = 2;

    function drawRoundRect(x: number, y: number, w: number, h: number, r: number) {
      if (typeof ctx2d!.roundRect === "function") {
        ctx2d!.roundRect(x, y, w, h, r);
      } else {
        ctx2d!.rect(x, y, w, h);
      }
    }

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const analyser = analyserRef.current;
      const W = canvas.width;
      const H = canvas.height;
      ctx2d.clearRect(0, 0, W, H);

      const now = performance.now();
      const dt = lastDrawTimeRef.current == null ? 16 : Math.min(48, now - lastDrawTimeRef.current);
      lastDrawTimeRef.current = now;

      const targetEnvelope = isPlaying && graphReadyRef.current ? 1 : 0;
      const step = dt / ENVELOPE_MS;
      if (envelopeRef.current < targetEnvelope) {
        envelopeRef.current = Math.min(targetEnvelope, envelopeRef.current + step);
      } else if (envelopeRef.current > targetEnvelope) {
        envelopeRef.current = Math.max(targetEnvelope, envelopeRef.current - step);
      }

      const envelope = smoothstep(envelopeRef.current);
      const scaleY = MIN_Y_SCALE + (1 - MIN_Y_SCALE) * envelope;

      const bufferLength = analyser?.frequencyBinCount ?? 0;
      if (bufferLength > 0 && !freqDataRef.current) {
        freqDataRef.current = new Uint8Array(bufferLength);
      }
      const data = freqDataRef.current ?? new Uint8Array(bufferLength);

      const canSample =
        analyser && isPlaying && graphReadyRef.current && ctxRef.current?.state === "running";

      if (canSample) analyser.getByteFrequencyData(data as Uint8Array<ArrayBuffer>);

      const barW = (W - GAP * (COUNT - 1)) / COUNT;

      const sampled = sampleLogFrequencyBands(data, COUNT, !!canSample, smoothedPeakRef.current);
      smoothedPeakRef.current = sampled.peak;
      if (canSample && sampled.amps.length > 0) {
        lastAmpsRef.current = sampled.amps;
      }

      const amps = lastAmpsRef.current;
      if (envelope <= 0.001 || amps.length === 0) return;

      ctx2d.save();
      ctx2d.globalAlpha = envelope;
      if (mode === "wave" || mode === "mirror") {
        ctx2d.translate(0, H / 2);
        ctx2d.scale(1, scaleY);
        ctx2d.translate(0, -H / 2);
      } else {
        ctx2d.translate(0, H);
        ctx2d.scale(1, scaleY);
        ctx2d.translate(0, -H);
      }

      if (mode === "bars") {
        // ── BARS: vertical frequency bars from the bottom ──────────────────
        for (let i = 0; i < COUNT; i++) {
          const t = amps[i] ?? 0;
          if (t <= 0) continue;
          const h = t * H * 0.65;
          const y = H - h;
          const x = i * (barW + GAP);
          const opacity = 0.32 + t * 0.68;
          ctx2d.fillStyle = `rgba(255,255,255,${opacity.toFixed(2)})`;
          ctx2d.beginPath();
          drawRoundRect(x, y, barW, h, 2);
          ctx2d.fill();
        }
      } else if (mode === "wave") {
        // ── WAVE: smooth line through amplitude midpoints ───────────────────
        const opacity = isPlaying ? 0.75 : 0.38;
        ctx2d.strokeStyle = `rgba(255,255,255,${opacity})`;
        ctx2d.lineWidth = 2;
        ctx2d.lineJoin = "round";
        ctx2d.beginPath();
        for (let i = 0; i < COUNT; i++) {
          const t = amps[i] ?? 0;
          const x = i * (barW + GAP) + barW / 2;
          const y = H / 2 - t * (H / 2 - 4);
          if (i === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
        }
        ctx2d.stroke();
        // Mirror the line below center
        ctx2d.beginPath();
        for (let i = 0; i < COUNT; i++) {
          const t = amps[i] ?? 0;
          const x = i * (barW + GAP) + barW / 2;
          const y = H / 2 + t * (H / 2 - 4);
          if (i === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
        }
        ctx2d.stroke();
      } else if (mode === "mirror") {
        // ── MIRROR: symmetric bars growing from center outward ─────────────
        for (let i = 0; i < COUNT; i++) {
          const t = amps[i] ?? 0;
          const halfH = Math.max(H * 0.1, t * (H / 2 - 4));
          const centerY = H / 2;
          const x = i * (barW + GAP);
          const opacity = isPlaying ? 0.28 + t * 0.72 : 0.38;
          ctx2d.fillStyle = `rgba(255,255,255,${opacity.toFixed(2)})`;
          // Top half
          ctx2d.beginPath();
          drawRoundRect(x, centerY - halfH, barW, halfH, 2);
          ctx2d.fill();
          // Bottom half
          ctx2d.beginPath();
          drawRoundRect(x, centerY, barW, halfH, 2);
          ctx2d.fill();
        }
      } else if (mode === "spectrum") {
        // ── SPECTRUM: gradient-colored bars (cool → warm by frequency) ──────
        for (let i = 0; i < COUNT; i++) {
          const t = amps[i] ?? 0;
          const h = Math.max(H * 0.08, t * H * 0.92);
          const y = H - h;
          const x = i * (barW + GAP);
          // Hue: low freq = cyan-blue (200°), high freq = red (0°)
          const hue = 200 - (i / COUNT) * 200;
          const saturation = isPlaying ? 80 : 40;
          const lightness = isPlaying ? 55 + t * 20 : 40;
          const alpha = isPlaying ? 0.35 + t * 0.65 : 0.35;
          ctx2d.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha.toFixed(2)})`;
          ctx2d.beginPath();
          drawRoundRect(x, y, barW, h, 2);
          ctx2d.fill();
        }
      }

      ctx2d.restore();
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [barCount, initGraph, isPlaying, mode]);

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      const ctx = ctxRef.current;
      if (ctx && ctx.state !== "closed") void ctx.close();
      ctxRef.current = null;
      analyserRef.current = null;
      sourceRef.current = null;
      mountedRef.current = false;
      graphReadyRef.current = false;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={384}
      height={canvasHeight}
      className={`w-full pointer-events-none ${className ?? ""}`}
      style={{ display: "block" }}
      aria-hidden
    />
  );
}

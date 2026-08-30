"use client";

import { renderLabel } from "@/lib/compliance/disclosure";
import type { TryOnResult as Result } from "@/lib/types";

interface Props {
  status: "idle" | "loading" | "done" | "error";
  result: Result | null;
  error: string | null;
  garmentName: string | null;
  onRetry: () => void;
}

export default function TryOnResult({
  status,
  result,
  error,
  garmentName,
  onRetry,
}: Props) {
  const label = status === "done" && result ? renderLabel(result) : null;

  return (
    <div className="space-y-3">
      <div className="tick-rule h-2 sm:ml-7" aria-hidden />

      <div className="relative sm:pl-7">
        {/* Grain line: the axis a pattern piece is cut along. */}
        <GrainLine label={garmentName} />

        <div className="relative mx-auto aspect-3/4 max-h-[34rem] overflow-hidden bg-mat">
          {status === "done" && result ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.image}
                alt={
                  garmentName
                    ? `You wearing the ${garmentName}`
                    : "Your try-on result"
                }
                className="tissue-in h-full w-full object-cover"
              />
              <BastingStitch />
              {/* On the image, not only beneath it. C2PA and SynthID travel in
                  the file; a person looking at the screen sees neither. */}
              {label && (
                <span
                  className={`absolute top-3 right-3 max-w-[calc(100%-1.5rem)] px-2 py-1 font-mono text-[10px] leading-tight tracking-wide uppercase backdrop-blur-sm ${
                    label.tone === "warn"
                      ? "bg-redline/90 text-tissue"
                      : "bg-graphite/85 text-chalk"
                  }`}
                >
                  {label.text}
                </span>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              {status === "loading" && (
                <>
                  <Pins />
                  <p className="font-mono text-[11px] tracking-widest text-chalk uppercase">
                    Fitting
                  </p>
                </>
              )}

              {status === "error" && (
                <>
                  <p className="max-w-xs text-sm text-tissue">
                    {error ?? "The fit could not be rendered."}
                  </p>
                  <button
                    onClick={onRetry}
                    className="border border-chalk px-4 py-2 font-mono text-[11px] tracking-widest text-chalk uppercase transition hover:bg-chalk hover:text-mat"
                  >
                    Try again
                  </button>
                </>
              )}

              {status === "idle" && (
                <p className="max-w-[15rem] text-sm text-mat-ink">
                  Add your photo, then choose a garment.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-5 flex-wrap items-center justify-between gap-2 font-mono text-[11px] tracking-wide text-mat-ink uppercase sm:ml-7">
        {status === "done" && result ? (
          <>
            <span>
              {result.provider} · {result.elapsedMs}ms
            </span>
            {/* The disclosure itself sits on the image. Only the provenance
                detail lives down here, so the two cannot drift apart. */}
            <span className="normal-case">Not stored · discarded after this request</span>
          </>
        ) : (
          <span aria-hidden />
        )}
      </div>
    </div>
  );
}

function BastingStitch() {
  return (
    <svg
      className="baste pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      viewBox="0 0 300 400"
      aria-hidden
    >
      <rect
        x="11"
        y="11"
        width="278"
        height="378"
        fill="none"
        stroke="#74c0d4"
        strokeOpacity="0.55"
        strokeWidth="1"
        pathLength="1200"
      />
    </svg>
  );
}

function GrainLine({ label }: { label: string | null }) {
  return (
    <div
      className="absolute top-0 left-0 hidden h-full w-7 flex-col items-center justify-center gap-2 sm:flex"
      aria-hidden
    >
      <svg viewBox="0 0 8 40" className="h-4 w-2 text-chalk/60" fill="none">
        <path d="M4 40V2M4 0L0 6M4 0l4 6" stroke="currentColor" strokeWidth="1" />
      </svg>
      <span
        className="font-mono text-[10px] tracking-[0.2em] whitespace-nowrap text-chalk/50 uppercase"
        style={{ writingMode: "vertical-rl" }}
      >
        {label ?? "Grain line"}
      </span>
      <svg viewBox="0 0 8 40" className="h-4 w-2 rotate-180 text-chalk/60" fill="none">
        <path d="M4 40V2M4 0L0 6M4 0l4 6" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  );
}

/** Three pins, dropping in sequence, while the fit is being assembled. */
function Pins() {
  return (
    <div className="flex gap-1.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-chalk"
          style={{
            animation: "tissue-in 600ms ease-in-out infinite alternate",
            animationDelay: `${i * 160}ms`,
          }}
        />
      ))}
    </div>
  );
}

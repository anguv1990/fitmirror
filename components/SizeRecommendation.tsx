"use client";

import type { FitRecommendation } from "@/lib/fit/types";

interface Props {
  status: "idle" | "loading" | "done" | "error";
  recommendation: FitRecommendation | null;
  error: string | null;
  /** An input changed and this result no longer reflects it. */
  stale?: boolean;
}

/**
 * The hero. Return-rate reduction comes from the size recommendation, not the
 * render, so this gets the largest type on the page.
 *
 * Every caveat the engine produces is surfaced here rather than hidden: the
 * confidence score, the photo-estimation bias warning, and the placeholder
 * size-chart flag. An unexplained recommendation is not trusted, and an
 * overclaimed one is an advertising-standards problem
 * (docs/03-compliance-uk.md §5).
 */
export default function SizeRecommendation({
  status,
  recommendation,
  error,
  stale = false,
}: Props) {
  if (status === "loading") {
    return (
      <Shell>
        <p className="font-mono text-[11px] tracking-widest text-graphite/50 uppercase">
          Working out your size…
        </p>
      </Shell>
    );
  }

  if (status === "error") {
    return (
      <Shell>
        <p className="text-sm text-graphite">{error ?? "Could not work out a size."}</p>
      </Shell>
    );
  }

  if (status !== "done" || !recommendation || !recommendation.recommendedSize) {
    return (
      <Shell>
        <p className="max-w-[18rem] text-sm text-graphite/70">
          Enter your height and chest measurement to get a size.
        </p>
      </Shell>
    );
  }

  const { recommendedSize, confidence, reason, alternativeSize } = recommendation;
  const percent = Math.round(confidence * 100);

  return (
    <div
      className={`relative bg-tissue p-5 text-graphite transition-opacity ${
        stale ? "opacity-50" : "opacity-100"
      }`}
      aria-busy={stale}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] tracking-widest text-graphite/50 uppercase">
            Your size
            {stale && <span className="ml-2 text-graphite/70">· updating…</span>}
          </span>
          <p className="font-display text-6xl leading-none font-semibold tracking-tight uppercase">
            {recommendedSize}
          </p>
        </div>

        <div className="text-right">
          <span className="font-mono text-[10px] tracking-widest text-graphite/50 uppercase">
            Confidence
          </span>
          <p className="font-mono text-2xl leading-none text-graphite">{percent}%</p>
          <div
            className="mt-1.5 h-1 w-24 bg-graphite/15"
            role="img"
            aria-label={`Confidence ${percent} percent`}
          >
            <div
              className="h-full bg-graphite"
              style={{ width: `${Math.max(percent, 2)}%` }}
            />
          </div>
        </div>
      </div>

      <p className="mt-4 border-t border-graphite/15 pt-3 text-sm leading-relaxed text-graphite">
        {reason}
      </p>

      {alternativeSize && (
        <p className="mt-2 font-mono text-[11px] tracking-wide text-graphite/60 uppercase">
          Also consider {alternativeSize}
        </p>
      )}

      <Caveats recommendation={recommendation} />
    </div>
  );
}

function Caveats({ recommendation }: { recommendation: FitRecommendation }) {
  const notes: string[] = [];

  if (recommendation.estimateCaveat) notes.push(recommendation.estimateCaveat);
  if (recommendation.outOfChartRange) {
    notes.push("Your measurements fall outside this size chart's range.");
  }
  if (!recommendation.sizeChartVerified) {
    notes.push(
      `Placeholder size chart — ${recommendation.sizeChartSource}. Not a real brand's published measurements.`,
    );
  }

  if (notes.length === 0) return null;

  return (
    <ul className="mt-3 space-y-1.5 border-t border-graphite/15 pt-3">
      {notes.map((note) => (
        <li key={note} className="flex gap-2 text-xs leading-relaxed text-graphite/70">
          <span aria-hidden className="text-redline">
            •
          </span>
          {note}
        </li>
      ))}
    </ul>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[9rem] items-center justify-center bg-tissue p-5 text-center">
      {children}
    </div>
  );
}

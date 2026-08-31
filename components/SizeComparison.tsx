"use client";

import { SIZE_CHARTS } from "@/lib/fit/sizeCharts";
import type { BodyMeasurements, FitRecommendation, SizeScore } from "@/lib/fit/types";

interface Props {
  recommendation: FitRecommendation | null;
  sizeChartId: string;
  /** An input changed and this no longer reflects it. */
  stale?: boolean;
}

/**
 * Recommended size against the next-best one, measurement by measurement.
 *
 * ## Why this exists
 *
 * Google Shopping renders the garment on you. It does not tell you which size to
 * order, so the shopper still resolves that by **bracketing** — ordering two or
 * three sizes intending to return most of them. Bracketing is the named
 * behaviour behind the returns figure this product exists to attack, so the
 * useful question is not "does it suit me" but "which one do I order".
 *
 * ## Why it is not two renders
 *
 * The obvious design is the same body rendered twice, once per size. **No
 * commercially available model can do that.** Vertex `virtual-try-on-001` takes
 * a person and a garment image and has no size input, and retailers do not
 * publish per-size garment photography. Fit-aware rendering with explicit size
 * control is a 2026 research direction (FitVTON, FitControler), not a product —
 * and its control is 16 body-size prototypes, still coarser than the
 * centimetre-level bands compared here.
 *
 * Two identical images captioned with different sizes would imply the render
 * reflects the size. It would not. So the comparison is built from the chart
 * data, which is real, and the render stays singular and honest.
 *
 * ## The one number never shown
 *
 * Fit preference is applied as ease *before* matching, so a shopper's raw
 * measurement does not correspond to the band position drawn here. Printing the
 * raw figure beside an eased position is what produced self-contradictory
 * explanations twice before. Positions are shown, figures are not.
 */
export default function SizeComparison({
  recommendation,
  sizeChartId,
  stale = false,
}: Props) {
  if (!recommendation?.recommendedSize || !recommendation.alternativeSize) return null;

  const chart = SIZE_CHARTS.find((c) => c.id === sizeChartId);
  if (!chart) return null;

  const { recommendedSize, alternativeSize, scores } = recommendation;

  const columns = [
    { size: recommendedSize, role: "Recommended", primary: true },
    { size: alternativeSize, role: "Also consider", primary: false },
  ];

  // Only measurements the shopper actually supplied, so an empty waist does not
  // render an empty row on both sides.
  const keys = measuredKeys(scores, recommendedSize, alternativeSize);
  if (keys.length === 0) return null;

  return (
    <div
      className={`bg-tissue p-4 text-graphite transition-opacity sm:p-5 ${
        stale ? "opacity-50" : "opacity-100"
      }`}
      aria-busy={stale}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-mono text-[10px] tracking-widest text-graphite/55 uppercase">
          Which one to order
        </h3>
        <span className="font-mono text-[9px] tracking-wide text-graphite/40 uppercase">
          Where you sit in each band
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-5">
        {columns.map(({ size, role, primary }) => {
          const score = scores.find((s) => s.size === size);
          return (
            <div
              key={size}
              className={`border-t-2 pt-2.5 ${
                primary ? "border-graphite" : "border-graphite/25"
              }`}
            >
              <p
                className={`font-display leading-none tracking-tight uppercase ${
                  primary ? "text-2xl font-semibold" : "text-2xl font-normal text-graphite/70"
                }`}
              >
                {size}
              </p>
              <p className="mt-1 font-mono text-[9px] tracking-widest text-graphite/50 uppercase">
                {role}
              </p>

              <div className="mt-3 space-y-2.5">
                {keys.map((key) => {
                  const band = bandFor(chart.entries, size, key);
                  return (
                    <BandRow
                      key={key}
                      label={LABELS[key]}
                      band={band}
                      position={score?.positions[key]}
                      outOfRange={score?.outOfRange.includes(key) ?? false}
                      direction={outOfRangeDirection(
                        band,
                        bandFor(chart.entries, recommendedSize, key),
                      )}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 border-t border-graphite/15 pt-2.5 text-xs leading-snug text-graphite/60">
        The picture above shows the garment, not the size — no try-on model
        available today renders a different image per size. The bands are what
        distinguish them.
      </p>
    </div>
  );
}

const LABELS: Record<keyof BodyMeasurements, string> = {
  chestCm: "Chest",
  waistCm: "Waist",
  hipCm: "Hip",
};

/** Measurements scored on either size — i.e. the ones the shopper supplied. */
function measuredKeys(
  scores: SizeScore[],
  a: string,
  b: string,
): (keyof BodyMeasurements)[] {
  const relevant = scores.filter((s) => s.size === a || s.size === b);
  const keys: (keyof BodyMeasurements)[] = [];
  for (const key of ["chestCm", "waistCm", "hipCm"] as const) {
    const seen = relevant.some(
      (s) => s.positions[key] !== undefined || s.outOfRange.includes(key),
    );
    if (seen) keys.push(key);
  }
  return keys;
}

/**
 * Which way a size misses, derived from where its band sits relative to the
 * recommended one.
 *
 * The scores cannot answer this: `positions` is only populated for in-range
 * measurements, so an out-of-range entry carries no direction. Comparing the two
 * bands does answer it, and "would be tight" is far more use to someone choosing
 * between two sizes than "outside this size".
 *
 * Returns null for overlapping bands, where no honest direction exists.
 */
function outOfRangeDirection(
  band?: [number, number],
  reference?: [number, number],
): "tight" | "loose" | null {
  if (!band || !reference) return null;
  if (band[1] <= reference[0]) return "tight";
  if (band[0] >= reference[1]) return "loose";
  return null;
}

function bandFor(
  entries: { size: string; chestCm?: [number, number]; waistCm?: [number, number]; hipCm?: [number, number] }[],
  size: string,
  key: keyof BodyMeasurements,
): [number, number] | undefined {
  return entries.find((e) => e.size === size)?.[key];
}

/**
 * One measurement against one size's band.
 *
 * The marker says where in the band the shopper sits, not what they measure.
 * Out of range clamps to the edge and turns red rather than drawing off the end,
 * because "how far outside" is not something a fixed-width bar can honestly show.
 */
function BandRow({
  label,
  band,
  position,
  outOfRange,
  direction,
}: {
  label: string;
  band?: [number, number];
  position?: number;
  outOfRange: boolean;
  direction: "tight" | "loose" | null;
}) {
  if (!band) {
    return (
      <div>
        <Caption label={label} value="Not in this chart" muted />
      </div>
    );
  }

  const [lo, hi] = band;
  // Out of range pins to the end it overshoots, so the marker points the right
  // way even though the bar cannot show how far past it the shopper sits.
  const fallback = outOfRange ? (direction === "loose" ? 0 : 1) : 0.5;
  const clamped = Math.min(1, Math.max(0, position ?? fallback));

  return (
    <div>
      <Caption
        label={label}
        value={`${lo}–${hi}cm`}
        muted={false}
      />
      <div className="relative mt-1 h-1 bg-graphite/15">
        <span
          aria-hidden
          className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
            outOfRange ? "bg-redline" : "bg-graphite"
          }`}
          style={{ left: `${clamped * 100}%` }}
        />
      </div>
      <p
        className={`mt-1 font-mono text-[9px] tracking-wide uppercase ${
          outOfRange ? "text-redline" : "text-graphite/55"
        }`}
      >
        {describe(clamped, outOfRange, direction)}
      </p>
    </div>
  );
}

function describe(
  position: number,
  outOfRange: boolean,
  direction: "tight" | "loose" | null,
): string {
  if (outOfRange) {
    if (direction === "tight") return "Above this band — would pull";
    if (direction === "loose") return "Below this band — would hang loose";
    return "Outside this size";
  }
  if (position <= 0.25) return "Lower end — room to spare";
  if (position >= 0.75) return "Upper end — snug";
  return "Sits mid-band";
}

function Caption({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="font-mono text-[9px] tracking-widest text-graphite/55 uppercase">
        {label}
      </span>
      <span
        className={`font-mono text-[9px] tracking-wide uppercase ${
          muted ? "text-graphite/35" : "text-graphite/45"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

import type {
  BodyMeasurements,
  FitPreference,
  FitRecommendation,
  MeasurementSource,
  SizeChart,
  SizeChartEntry,
  SizeScore,
} from "./types";

/**
 * Relative importance of each measurement for upper-body garments. Chest
 * dominates: a top that does not fit across the chest does not fit, whatever the
 * waist says. Weights are renormalised over whichever measurements are supplied.
 */
const WEIGHTS: Record<keyof BodyMeasurements, number> = {
  chestCm: 0.6,
  waistCm: 0.25,
  hipCm: 0.15,
};

/**
 * Ease applied before matching, in cm. This is how fit preference is expressed:
 * asking for a relaxed fit means matching as though you were slightly larger, so
 * you land in a roomier size.
 */
const PREFERENCE_EASE_CM: Record<FitPreference, number> = {
  fitted: -2,
  regular: 0,
  relaxed: 4,
};

/**
 * Ceiling on reported confidence. A perfect measurement match still cannot
 * account for variation in garment cut, so the system never claims certainty.
 */
const MAX_CONFIDENCE = 0.95;

/**
 * Centimetres of distance at which an out-of-range measurement scores half.
 * Fixed rather than band-relative so sizes stay comparable across charts with
 * very different band widths.
 */
const OUT_OF_RANGE_DECAY_CM = 10;

const MEASUREMENT_LABELS: Record<keyof BodyMeasurements, string> = {
  chestCm: "chest",
  waistCm: "waist",
  hipCm: "hip",
};

const PHOTO_CAVEAT =
  "Estimated from a photo, so treat this as approximate. Photo-based " +
  "measurement tends to under-read width, which can bias the result small — " +
  "entering your measurements directly gives a better recommendation.";

export interface RecommendOptions {
  measurements: BodyMeasurements;
  chart: SizeChart;
  fitPreference?: FitPreference;
  measurementSource?: MeasurementSource;
}

export function recommendSize({
  measurements,
  chart,
  fitPreference = "regular",
  measurementSource = "declared",
}: RecommendOptions): FitRecommendation {
  const provided = (Object.keys(WEIGHTS) as (keyof BodyMeasurements)[]).filter(
    (key) => typeof measurements[key] === "number" && measurements[key]! > 0,
  );

  const base: Omit<FitRecommendation, "recommendedSize" | "confidence" | "reason"> = {
    alternativeSize: null,
    measurementSource,
    scores: [],
    sizeChartSource: chart.source,
    sizeChartVerified: chart.verified,
    ...(measurementSource === "estimated_from_photo"
      ? { estimateCaveat: PHOTO_CAVEAT }
      : {}),
  };

  if (provided.length === 0) {
    return {
      ...base,
      recommendedSize: null,
      confidence: 0,
      reason:
        "No measurements were provided. Enter at least a chest measurement to get a size recommendation.",
    };
  }

  const ease = PREFERENCE_EASE_CM[fitPreference];
  const adjusted: BodyMeasurements = {};
  for (const key of provided) adjusted[key] = measurements[key]! + ease;

  const scores = chart.entries.map((entry) => scoreEntry(entry, adjusted, provided));
  const ranked = [...scores].sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  const runnerUp = ranked[1];

  // Every measurement outside every band means the shopper is off the chart.
  const outOfChartRange = scores.every((s) => s.outOfRange.length === provided.length);

  const confidence = computeConfidence({
    winner,
    runnerUp,
    provided,
    adjusted,
    chart,
    measurementSource,
    outOfChartRange,
  });

  const alternativeSize =
    runnerUp && winner.score - runnerUp.score < 0.15 ? runnerUp.size : null;

  return {
    ...base,
    recommendedSize: winner.size,
    confidence: round2(confidence),
    alternativeSize,
    outOfChartRange: outOfChartRange || undefined,
    scores,
    reason: buildReason({
      winner,
      alternativeSize,
      measurements,
      adjusted,
      ease,
      provided,
      chart,
      fitPreference,
      outOfChartRange,
    }),
  };
}

function scoreEntry(
  entry: SizeChartEntry,
  adjusted: BodyMeasurements,
  provided: (keyof BodyMeasurements)[],
): SizeScore {
  const positions: SizeScore["positions"] = {};
  const outOfRange: (keyof BodyMeasurements)[] = [];
  let weighted = 0;
  let weightTotal = 0;

  for (const key of provided) {
    const range = entry[key];
    const value = adjusted[key]!;
    const weight = WEIGHTS[key];

    // A chart row that omits this measurement cannot speak to it either way.
    if (!range) continue;

    weightTotal += weight;
    const [lo, hi] = range;

    if (value >= lo && value <= hi) {
      positions[key] = round2(hi === lo ? 0.5 : (value - lo) / (hi - lo));
      weighted += weight;
      continue;
    }

    outOfRange.push(key);
    // Decay asymptotically rather than clamping to zero. A linear decay floors
    // every far-out size at 0, which makes them indistinguishable and lets the
    // sort return the first entry — recommending XS to someone off the top of
    // the chart. This keeps the ordering by distance meaningful at any extreme.
    //
    // The scale is a fixed number of centimetres, deliberately NOT the band
    // width: normalising by band width lets a wide band beat a near one at long
    // range, because the same absolute distance reads as "fewer bands away".
    // With Boden's UK 4 (a wide open-ended band) that ranked UK 4 above UK 22
    // for a 135cm bust. Absolute distance is what "nearest size" means.
    const distance = value < lo ? lo - value : value - hi;
    weighted += weight * (1 / (1 + distance / OUT_OF_RANGE_DECAY_CM));
  }

  return {
    size: entry.size,
    score: weightTotal === 0 ? 0 : round2(weighted / weightTotal),
    positions,
    outOfRange,
  };
}

function computeConfidence({
  winner,
  runnerUp,
  provided,
  adjusted,
  chart,
  measurementSource,
  outOfChartRange,
}: {
  winner: SizeScore;
  runnerUp?: SizeScore;
  provided: (keyof BodyMeasurements)[];
  adjusted: BodyMeasurements;
  chart: SizeChart;
  measurementSource: MeasurementSource;
  outOfChartRange: boolean;
}): number {
  let confidence = winner.score;

  // Two sizes scoring nearly the same means the shopper sits on a boundary.
  if (runnerUp) {
    const gap = winner.score - runnerUp.score;
    confidence *= 1 - Math.max(0, 1 - gap * 5) * 0.3;
  }

  // Measurements pointing at different sizes is a genuine signal of uncertainty.
  if (provided.length > 1 && !measurementsAgree(provided, adjusted, chart)) {
    confidence *= 0.8;
  }

  // A single measurement is a thinner basis than three.
  if (provided.length === 1) confidence *= 0.85;

  // Photo estimation carries known width bias — see docs/03-compliance-uk.md §6.
  if (measurementSource === "estimated_from_photo") confidence *= 0.85;

  if (outOfChartRange) confidence *= 0.4;

  // A placeholder chart is a real source of uncertainty, not a formality.
  if (!chart.verified) confidence *= 0.9;

  // Never assert certainty. Garment cut varies within a size regardless of how
  // well the measurements match, and claiming a precision we cannot evidence is
  // an advertising-standards risk — see docs/03-compliance-uk.md §5.
  return clamp(confidence, 0, MAX_CONFIDENCE);
}

/** True when each supplied measurement independently favours the same size. */
function measurementsAgree(
  provided: (keyof BodyMeasurements)[],
  adjusted: BodyMeasurements,
  chart: SizeChart,
): boolean {
  const bestPer = provided
    .map((key) => bestSizeFor(key, adjusted[key]!, chart))
    .filter((size): size is string => size !== null);
  return new Set(bestPer).size <= 1;
}

function bestSizeFor(
  key: keyof BodyMeasurements,
  value: number,
  chart: SizeChart,
): string | null {
  let best: string | null = null;
  let bestDistance = Infinity;

  for (const entry of chart.entries) {
    const range = entry[key];
    if (!range) continue;
    const [lo, hi] = range;
    const distance = value < lo ? lo - value : value > hi ? value - hi : 0;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = entry.size;
    }
  }
  return best;
}

function buildReason({
  winner,
  alternativeSize,
  measurements,
  adjusted,
  ease,
  provided,
  chart,
  fitPreference,
  outOfChartRange,
}: {
  winner: SizeScore;
  alternativeSize: string | null;
  measurements: BodyMeasurements;
  adjusted: BodyMeasurements;
  ease: number;
  provided: (keyof BodyMeasurements)[];
  chart: SizeChart;
  fitPreference: FitPreference;
  outOfChartRange: boolean;
}): string {
  if (outOfChartRange) {
    return (
      `Your measurements sit outside this chart, which runs ` +
      `${chart.entries[0].size} to ${chart.entries[chart.entries.length - 1].size}. ` +
      `${winner.size} is the closest available size, but expect the fit to be off.`
    );
  }

  const entry = chart.entries.find((e) => e.size === winner.size)!;
  const parts: string[] = [];

  // Lead with the heaviest-weighted measurement that actually landed in range.
  const primary = provided.find((key) => winner.positions[key] !== undefined);
  if (primary) {
    const range = entry[primary]!;
    const position = winner.positions[primary]!;
    const label = MEASUREMENT_LABELS[primary];
    const actual = measurements[primary]!;

    // With a fit preference applied we match against an eased figure, not the
    // raw measurement. Quoting the raw one against the matched band reads as a
    // contradiction ("96.5cm is at the upper end of 91-96cm"), so show both.
    parts.push(
      ease === 0
        ? `Your ${label} (${actual}cm) sits ${describePosition(position)} ` +
            `${winner.size} (${range[0]}–${range[1]}cm).`
        : `Allowing for a ${fitPreference} cut, your ${label} (${actual}cm) is ` +
            `matched at ${round2(adjusted[primary]!)}cm — ${describePosition(position)} ` +
            `${winner.size} (${range[0]}–${range[1]}cm).`,
    );
  }

  for (const key of winner.outOfRange) {
    const range = entry[key];
    if (!range) continue;
    const value = measurements[key]!;
    parts.push(
      `Your ${MEASUREMENT_LABELS[key]} (${value}cm) is ${value < range[0] ? "below" : "above"} ` +
        `the ${winner.size} range (${range[0]}–${range[1]}cm).`,
    );
  }

  if (alternativeSize) {
    parts.push(`${alternativeSize} would also work — size up if you prefer more room.`);
  }

  return parts.join(" ");
}

function describePosition(position: number): string {
  if (position <= 0.2) return "at the smaller end of";
  if (position <= 0.4) return "comfortably within";
  if (position <= 0.6) return "mid-range for";
  if (position <= 0.8) return "toward the upper end of";
  return "at the top of";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

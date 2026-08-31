/**
 * Calibration statistics for the photo-based measurement path (gate G8).
 *
 * `measure.ts` turns a shoulder width into a chest circumference by multiplying
 * by a population average. Those multipliers have never been checked against a
 * real body. This module answers two questions from a set of photos with known
 * tape measurements:
 *
 *   1. How wrong is it, in centimetres, and in which direction?
 *   2. Is the sample good enough to justify changing a constant?
 *
 * **Question 2 is the important one.** The tempting mistake is to average a
 * handful of photos, scale the multiplier to match, and declare it calibrated.
 * That fits noise and hides behind a number that looks measured. This module
 * refuses to recommend a change unless the evidence supports one, and says why.
 */

import type { BodyMeasurements } from "../fit/types";

/**
 * Measurements this harness can calibrate.
 *
 * `hipCm` is retained deliberately even though the photo path no longer produces
 * one: hip was removed because pose landmarks give joint centres rather than the
 * outer hip, and recovering it needs image segmentation. When that lands, this
 * is what validates it. Until then the harness reports `no-data` for hip, which
 * is the accurate answer rather than a gap.
 */
export type CalibratedKey = "chestCm" | "hipCm";

export const CALIBRATED_KEYS: readonly CalibratedKey[] = ["chestCm", "hipCm"];

export interface CalibrationSample {
  /**
   * Who this photo is of. **Distinct people, not distinct photos.** Five photos
   * of one person are one observation of the population, repeated five times —
   * they say a lot about pose robustness and nothing about whether a
   * population-average multiplier is right.
   */
  subject: string;
  /** Free label for the photo itself, e.g. "front", "left side". */
  label: string;
  /** Tape-measured ground truth. Missing keys are skipped, not guessed. */
  actual: BodyMeasurements;
  /** What `estimateMeasurements` produced for this photo. */
  estimated: BodyMeasurements;
}

/**
 * Minimum distinct **people** before a multiplier change is defensible.
 *
 * Not a statistical threshold so much as an honesty one: below this, any
 * apparent bias is at least as likely to be one person's proportions as a fault
 * in the model. The compliance note (§6) records that the known bias varies by
 * sex, so a single-subject sample cannot detect it even in principle.
 */
export const MIN_SUBJECTS_FOR_MULTIPLIER_CHANGE = 8;

export type Recommendation =
  | "no-data"
  | "insufficient-subjects"
  | "no-significant-bias"
  | "adjust-multiplier";

export interface ErrorStats {
  key: CalibratedKey;
  /** Number of photos contributing a paired estimate and ground truth. */
  n: number;
  /** Number of distinct people among those photos. */
  subjects: number;
  /** Signed mean of (estimated − actual). Negative means it reads small. */
  meanErrorCm: number;
  /** Mean of |estimated − actual|, i.e. typical size of the miss. */
  meanAbsErrorCm: number;
  /** Sample standard deviation of the signed error. 0 when n < 2. */
  sdCm: number;
  /** Half-width of the 95% confidence interval on `meanErrorCm`. */
  ci95HalfWidthCm: number;
  worstErrorCm: number;
  /**
   * Factor to multiply the current width-to-circumference constant by, so the
   * mean estimate would land on the mean truth. Only meaningful when
   * `recommendation` is `adjust-multiplier`.
   */
  correctionFactor: number;
  recommendation: Recommendation;
  rationale: string;
}

/**
 * Two-tailed t critical values at 95%, indexed by degrees of freedom.
 *
 * Using 1.96 at n=3 would understate the interval by roughly a factor of two and
 * make a noisy sample look conclusive — the exact error this module exists to
 * prevent.
 */
const T95: Record<number, number> = {
  1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365,
  8: 2.306, 9: 2.262, 10: 2.228, 11: 2.201, 12: 2.179, 13: 2.16, 14: 2.145,
  15: 2.131, 16: 2.12, 17: 2.11, 18: 2.101, 19: 2.093, 20: 2.086, 21: 2.08,
  22: 2.074, 23: 2.069, 24: 2.064, 25: 2.06, 26: 2.056, 27: 2.052, 28: 2.048,
  29: 2.045, 30: 2.042,
};

function tCritical(df: number): number {
  if (df < 1) return Number.POSITIVE_INFINITY;
  return T95[df] ?? 1.96;
}

/** Statistics for one measurement across the sample. */
export function analyse(
  samples: readonly CalibrationSample[],
  key: CalibratedKey,
): ErrorStats {
  const paired = samples.filter(
    (s) =>
      typeof s.actual[key] === "number" &&
      typeof s.estimated[key] === "number" &&
      s.estimated[key]! > 0,
  );

  const n = paired.length;
  const subjects = new Set(paired.map((s) => s.subject)).size;

  const empty: ErrorStats = {
    key,
    n: 0,
    subjects: 0,
    meanErrorCm: 0,
    meanAbsErrorCm: 0,
    sdCm: 0,
    ci95HalfWidthCm: 0,
    worstErrorCm: 0,
    correctionFactor: 1,
    recommendation: "no-data",
    rationale: `No photo has both an estimate and a tape measurement for ${label(key)}.`,
  };
  if (n === 0) return empty;

  const errors = paired.map((s) => s.estimated[key]! - s.actual[key]!);
  const meanErrorCm = mean(errors);
  const meanAbsErrorCm = mean(errors.map(Math.abs));
  const sdCm = n > 1 ? Math.sqrt(mean2(errors, meanErrorCm) / (n - 1)) : 0;
  const ci95HalfWidthCm = n > 1 ? tCritical(n - 1) * (sdCm / Math.sqrt(n)) : Infinity;
  const worstErrorCm = errors.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0);

  // Per-photo ratio then averaged, rather than a ratio of the two means: each
  // photo is one observation and should carry equal weight regardless of body
  // size.
  const correctionFactor = mean(paired.map((s) => s.actual[key]! / s.estimated[key]!));

  const { recommendation, rationale } = judge({
    key,
    n,
    subjects,
    meanErrorCm,
    ci95HalfWidthCm,
    correctionFactor,
  });

  return {
    key,
    n,
    subjects,
    meanErrorCm: round1(meanErrorCm),
    meanAbsErrorCm: round1(meanAbsErrorCm),
    sdCm: round1(sdCm),
    ci95HalfWidthCm: Number.isFinite(ci95HalfWidthCm) ? round1(ci95HalfWidthCm) : Infinity,
    worstErrorCm: round1(worstErrorCm),
    correctionFactor: round3(correctionFactor),
    recommendation,
    rationale,
  };
}

function judge({
  key,
  n,
  subjects,
  meanErrorCm,
  ci95HalfWidthCm,
  correctionFactor,
}: {
  key: CalibratedKey;
  n: number;
  subjects: number;
  meanErrorCm: number;
  ci95HalfWidthCm: number;
  correctionFactor: number;
}): { recommendation: Recommendation; rationale: string } {
  const direction = meanErrorCm < 0 ? "under" : "over";
  const size = Math.abs(meanErrorCm).toFixed(1);

  // Subject count is checked before significance on purpose. A tight interval
  // across many photos of one person is precision about that person, not
  // evidence about a population multiplier.
  if (subjects < MIN_SUBJECTS_FOR_MULTIPLIER_CHANGE) {
    return {
      recommendation: "insufficient-subjects",
      rationale:
        `${subjects} ${subjects === 1 ? "person" : "people"} across ${n} ` +
        `${n === 1 ? "photo" : "photos"}. ${label(key)} reads ${size}cm ${direction} on this ` +
        `sample, but ${MIN_SUBJECTS_FOR_MULTIPLIER_CHANGE} distinct people are needed before ` +
        `changing a population multiplier — below that, the difference is as likely to be ` +
        `these bodies as the model. **Report the measured error in the caveat instead.**`,
    };
  }

  if (ci95HalfWidthCm >= Math.abs(meanErrorCm)) {
    return {
      recommendation: "no-significant-bias",
      rationale:
        `Mean error ${meanErrorCm.toFixed(1)}cm, but the 95% interval ` +
        `(±${ci95HalfWidthCm.toFixed(1)}cm) spans zero across ${subjects} people. ` +
        `No detectable systematic bias — leave the multiplier alone.`,
    };
  }

  return {
    recommendation: "adjust-multiplier",
    rationale:
      `${label(key)} reads ${size}cm ${direction} across ${subjects} people ` +
      `(95% interval ±${ci95HalfWidthCm.toFixed(1)}cm, excludes zero). ` +
      `Multiply the current constant by ${correctionFactor.toFixed(3)}.`,
  };
}

/** New constant value, given the one in use. */
export function suggestedMultiplier(current: number, stats: ErrorStats): number {
  if (stats.recommendation !== "adjust-multiplier") return current;
  return round3(current * stats.correctionFactor);
}

/**
 * One line per measurement, for the caveat shown to shoppers when the sample is
 * too small to fix the model but big enough to describe the error honestly.
 */
export function caveatLine(stats: ErrorStats): string | null {
  if (stats.n === 0) return null;
  const direction = stats.meanErrorCm < 0 ? "small" : "large";
  return (
    `${label(stats.key)} estimates ran ${Math.abs(stats.meanErrorCm).toFixed(1)}cm ` +
    `${direction} on average against tape measurements ` +
    `(${stats.n} ${stats.n === 1 ? "photo" : "photos"}, ${stats.subjects} ` +
    `${stats.subjects === 1 ? "person" : "people"}; worst miss ` +
    `${Math.abs(stats.worstErrorCm).toFixed(1)}cm).`
  );
}

function label(key: CalibratedKey): string {
  return key === "chestCm" ? "Chest" : "Hip";
}

function mean(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function mean2(values: readonly number[], m: number): number {
  return values.reduce((a, b) => a + (b - m) ** 2, 0);
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

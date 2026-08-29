import {
  POSE,
  REQUIRED_LANDMARKS,
  SCALE_LANDMARKS,
  type PoseLandmark,
} from "./landmarks";
import type { BodyMeasurements } from "../fit/types";

/**
 * Estimate body measurements from pose landmarks.
 *
 * ## What this is, honestly
 *
 * A **coarse anthropometric approximation**, not a measurement. A single frontal
 * photo gives width but not depth, so circumferences are inferred from width
 * using population-average ratios. Individual bodies deviate from those averages
 * substantially. Treat the output as a starting point that a shopper can correct,
 * never as ground truth — see docs/03-compliance-uk.md §5 on not overclaiming.
 *
 * ## Why declared height is mandatory
 *
 * A photo has **no absolute scale**. Pixel distances cannot become centimetres
 * without a known reference. Declared height is that reference. Any design that
 * promises measurements from a bare photo is wrong (docs/01-landscape.md §4).
 *
 * ## Why waist is deliberately not estimated
 *
 * There is no waist landmark, and waist circumference has the widest individual
 * variation of the three measurements at a given frame size — two people with
 * identical shoulders and hips can differ by 25cm at the waist. Interpolating one
 * would produce a confident-looking number with no support in the data. Omitting
 * it is more honest, and the fit engine already handles partial measurements by
 * lowering confidence.
 */

/** Eye height as a fraction of stature (standard anthropometric approximation). */
const EYE_HEIGHT_FRACTION = 0.936;

/**
 * Width-to-circumference multipliers, calibrated against adult population
 * averages. These are the crudest part of the model and the first thing to
 * revisit with real calibration data.
 */
const SHOULDER_TO_CHEST_CIRCUMFERENCE = 2.45;
const HIP_WIDTH_TO_CIRCUMFERENCE = 3.1;

/** Minimum MediaPipe visibility for a landmark to be trusted. */
const MIN_VISIBILITY = 0.5;

/** Outputs outside these bounds indicate a bad pose rather than an unusual body. */
const PLAUSIBLE = { chestCm: [60, 160], hipCm: [60, 170] } as const;

/**
 * Maximum left/right depth difference before the subject is treated as turned.
 * Foreshortening in a rotated pose narrows apparent width and biases the estimate
 * small — the same direction as the bias documented in §6 of the compliance note,
 * so it compounds rather than cancels.
 */
const MAX_ROTATION_Z = 0.28;

export type PoseQualityIssue =
  | "missing_landmarks"
  | "low_visibility"
  | "no_full_body"
  | "rotated"
  | "implausible_result";

export interface MeasurementEstimate {
  ok: boolean;
  measurements: BodyMeasurements;
  issues: PoseQualityIssue[];
  /** Human-readable explanation of the first blocking issue, if any. */
  message?: string;
  /** Derived scale, exposed for debugging and calibration. */
  cmPerPixel?: number;
}

export interface EstimateOptions {
  landmarks: PoseLandmark[];
  /** Declared stature in centimetres. Required — see the note above. */
  heightCm: number;
  imageWidth: number;
  imageHeight: number;
}

export function estimateMeasurements({
  landmarks,
  heightCm,
  imageWidth,
  imageHeight,
}: EstimateOptions): MeasurementEstimate {
  const issues: PoseQualityIssue[] = [];

  if (!Number.isFinite(heightCm) || heightCm < 100 || heightCm > 250) {
    return {
      ok: false,
      measurements: {},
      issues: ["missing_landmarks"],
      message: "A declared height between 100cm and 250cm is required to set the scale.",
    };
  }

  for (const index of REQUIRED_LANDMARKS) {
    if (!landmarks[index]) {
      return {
        ok: false,
        measurements: {},
        issues: ["missing_landmarks"],
        message: "No full body detected. Use a photo showing you head to feet, facing the camera.",
      };
    }
  }

  if (REQUIRED_LANDMARKS.some((i) => (landmarks[i].visibility ?? 1) < MIN_VISIBILITY)) {
    issues.push("low_visibility");
  }

  const topY = bestY(landmarks, SCALE_LANDMARKS.top, Math.min);
  const bottomY = bestY(landmarks, SCALE_LANDMARKS.bottom, Math.max);

  if (topY === null || bottomY === null || bottomY <= topY) {
    return {
      ok: false,
      measurements: {},
      issues: [...issues, "no_full_body"],
      message:
        "Could not see you head to feet. A full-length photo is needed to work out the scale.",
    };
  }

  // Rotation check before trusting any width.
  const shoulderZ = Math.abs(
    landmarks[POSE.LEFT_SHOULDER].z - landmarks[POSE.RIGHT_SHOULDER].z,
  );
  if (shoulderZ > MAX_ROTATION_Z) {
    return {
      ok: false,
      measurements: {},
      issues: [...issues, "rotated"],
      message:
        "You appear turned away from the camera, which makes the estimate read small. Face the camera straight on.",
    };
  }

  // Scale: the eye-to-heel span covers a known fraction of stature.
  const spanPx = (bottomY - topY) * imageHeight;
  const cmPerPixel = (heightCm * EYE_HEIGHT_FRACTION) / spanPx;

  const shoulderPx = distancePx(
    landmarks[POSE.LEFT_SHOULDER],
    landmarks[POSE.RIGHT_SHOULDER],
    imageWidth,
    imageHeight,
  );
  const hipPx = distancePx(
    landmarks[POSE.LEFT_HIP],
    landmarks[POSE.RIGHT_HIP],
    imageWidth,
    imageHeight,
  );

  const chestCm = round1(shoulderPx * cmPerPixel * SHOULDER_TO_CHEST_CIRCUMFERENCE);
  const hipCm = round1(hipPx * cmPerPixel * HIP_WIDTH_TO_CIRCUMFERENCE);

  const measurements: BodyMeasurements = {};
  if (inRange(chestCm, PLAUSIBLE.chestCm)) measurements.chestCm = chestCm;
  if (inRange(hipCm, PLAUSIBLE.hipCm)) measurements.hipCm = hipCm;
  // waistCm intentionally omitted — see the note at the top of this file.

  if (Object.keys(measurements).length === 0) {
    return {
      ok: false,
      measurements: {},
      issues: [...issues, "implausible_result"],
      message:
        "The estimate came out outside a plausible range, which usually means the pose or the height is off. Enter your measurements instead.",
      cmPerPixel,
    };
  }

  return { ok: true, measurements, issues, cmPerPixel };
}

function bestY(
  landmarks: PoseLandmark[],
  indices: readonly number[],
  pick: (...values: number[]) => number,
): number | null {
  const visible = indices
    .map((i) => landmarks[i])
    .filter((l): l is PoseLandmark => !!l && (l.visibility ?? 1) >= MIN_VISIBILITY)
    .map((l) => l.y);
  return visible.length === 0 ? null : pick(...visible);
}

function distancePx(
  a: PoseLandmark,
  b: PoseLandmark,
  width: number,
  height: number,
): number {
  const dx = (a.x - b.x) * width;
  const dy = (a.y - b.y) * height;
  return Math.hypot(dx, dy);
}

function inRange(value: number, [min, max]: readonly [number, number]): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

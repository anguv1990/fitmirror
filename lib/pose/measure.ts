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
 * ## Why waist and hip are deliberately not estimated
 *
 * **Waist:** there is no waist landmark, and waist circumference has the widest
 * individual variation of the three measurements at a given frame size — two
 * people with identical shoulders and hips can differ by 25cm at the waist.
 *
 * **Hip:** landmarks 23 and 24 are the *hip joint positions* — MediaPipe's
 * world-coordinate origin sits between them — not the outer hip contour. Hip
 * circumference is measured at the widest point over the buttocks, which is soft
 * tissue that no pose landmark locates.
 *
 * Hip estimation shipped anyway, applying a width-to-circumference ratio to the
 * joint-centre distance as if it were a body breadth. Gate G8 calibration caught
 * it: real photos gave 72.1cm and 66.7cm against chests near 100cm, from a
 * joint-centre distance of ~23.3cm where the outer hip is nearer 35cm. The
 * shoulder figure resolved to ~40.9cm and was correct, so the scale was never
 * the problem — the landmark was.
 *
 * **It was removed rather than retuned.** Scaling the constant from 3.1 to ~4.3
 * makes the output look right while still measuring the wrong thing, and there
 * is no tape measurement to calibrate against — it would be fitting the symptom
 * to an assumption. Recovering hip needs a body outline, which means image
 * segmentation, not pose landmarks.
 *
 * Omitting both is more honest, and the fit engine already handles partial
 * measurements by lowering confidence. A shopper can still type either.
 */

/** Eye height as a fraction of stature (standard anthropometric approximation). */
const EYE_HEIGHT_FRACTION = 0.936;

/**
 * Width-to-circumference multiplier, a population average and the crudest part
 * of the model. Still uncalibrated: gate G8 has no tape measurements yet, and
 * `lib/pose/calibration.ts` refuses to move it below 8 distinct subjects.
 *
 * There is no hip equivalent any more — see the note above.
 */
const SHOULDER_TO_CHEST_CIRCUMFERENCE = 2.45;

/** Minimum MediaPipe visibility for a landmark to be trusted. */
const MIN_VISIBILITY = 0.5;

/**
 * Outputs outside these bounds indicate a bad pose rather than an unusual body.
 *
 * Worth remembering why this is a weak guard: the removed hip estimate produced
 * 66.7cm, which cleared its floor of 60cm comfortably. A plausibility range
 * catches broken poses, not a measurement of the wrong thing.
 */
const PLAUSIBLE = { chestCm: [60, 160] } as const;

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
  | "facing_away"
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

  // Orientation check before the rotation check: a back view is square-on, so
  // the depth test below passes it happily. Found by running real photos through
  // the calibration harness (gate G8) — a photo taken from behind returned a
  // confident chest measurement.
  //
  // MediaPipe reports landmarks in image space. Facing the camera, the subject's
  // own left shoulder appears on the viewer's right, so LEFT_SHOULDER.x is the
  // larger value. Facing away, that ordering inverts.
  if (landmarks[POSE.LEFT_SHOULDER].x < landmarks[POSE.RIGHT_SHOULDER].x) {
    return {
      ok: false,
      measurements: {},
      issues: [...issues, "facing_away"],
      message:
        "You appear to be facing away from the camera. A front-on photo is needed — a back view measures across the shoulder blades, not the chest.",
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
  const chestCm = round1(shoulderPx * cmPerPixel * SHOULDER_TO_CHEST_CIRCUMFERENCE);

  const measurements: BodyMeasurements = {};
  if (inRange(chestCm, PLAUSIBLE.chestCm)) measurements.chestCm = chestCm;
  // waistCm and hipCm are intentionally omitted — no landmark supports either.
  // See the note at the top of this file. The hip landmarks are still required
  // above, as a check that the pose is a full body rather than a crop.

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

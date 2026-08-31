import { estimateFromImageSource } from "../pose/estimator";
import type {
  MeasurementInput,
  MeasurementProvider,
  MeasurementResult,
  MeasuredValue,
} from "./types";

/**
 * Our own estimator, behind the seam. MediaPipe Pose in the browser.
 *
 * The default, and the reason a fresh clone works with no keys, no account and
 * no network: **the photo never leaves the device on this path.** That property
 * is what keeps the consent copy short and the demo alive on venue wifi, so it
 * should survive any future provider being added alongside.
 *
 * ## What it does not do
 *
 * A single frontal photo gives width but not depth, so circumference is inferred
 * from population-average ratios rather than measured. Two consequences are
 * reported honestly rather than hidden:
 *
 * - **Hip is marked `unreliable`.** Calibration against real photos (gate G8)
 *   produced hips of 72.1cm and 66.7cm against chests near 100cm. The cause is
 *   structural: `HIP_WIDTH_TO_CIRCUMFERENCE` is applied to MediaPipe's hip
 *   *joint centres* (~23cm apart), not the outer hip breadth (~35cm).
 *   `docs/04-prerequisite-gate.md` G8.
 * - **A side photo is accepted but not yet used.** Extracting depth needs a
 *   silhouette, which means image segmentation — pose landmarks are joint
 *   positions, not an outline. Recorded as the next real accuracy win.
 */
class LocalMeasurementProvider implements MeasurementProvider {
  readonly name = "local";
  readonly runsOn = "browser" as const;
  readonly requiresSideImage = false;

  async measure(input: MeasurementInput): Promise<MeasurementResult> {
    const estimate = await estimateFromImageSource(input.frontImage, input.heightCm);

    const base = {
      provider: this.name,
      photoLeftDevice: false,
      issues: estimate.issues as string[],
    };

    if (!estimate.ok) {
      return { ...base, ok: false, values: {}, message: estimate.message };
    }

    const values: MeasurementResult["values"] = {};

    if (typeof estimate.measurements.chestCm === "number") {
      values.chestCm = estimated(
        estimate.measurements.chestCm,
        "Inferred from shoulder width using population averages, not measured. Known to read narrow.",
      );
    }

    if (typeof estimate.measurements.hipCm === "number") {
      values.hipCm = {
        valueCm: estimate.measurements.hipCm,
        confidence: "unreliable",
        note:
          "Hip is derived from pose joint centres rather than the widest point, " +
          "and reads far too small. Excluded from the size recommendation — enter it yourself for a better result.",
      };
    }

    // waistCm is deliberately absent: no landmark supports it, and individual
    // variation at a given frame size is far too wide to interpolate honestly.

    return {
      ...base,
      ok: Object.keys(values).length > 0,
      values,
      message:
        Object.keys(values).length > 0
          ? undefined
          : "No usable measurement could be taken from this photo.",
    };
  }
}

function estimated(valueCm: number, note: string): MeasuredValue {
  return { valueCm, confidence: "estimated", note };
}

export const localMeasurementProvider = new LocalMeasurementProvider();

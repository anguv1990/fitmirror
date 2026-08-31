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
 * - **Only chest is returned.** Waist and hip are not estimated, because no pose
 *   landmark supports either. Hip was removed after gate-G8 calibration showed
 *   72.1cm and 66.7cm against chests near 100cm — the multiplier was being
 *   applied to MediaPipe's hip *joint centres* rather than the outer hip.
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

    // waistCm and hipCm are deliberately absent: no landmark supports either.
    // Hip used to be reported and was ~30cm low, because the multiplier was
    // applied to MediaPipe's hip *joint centres* rather than the outer hip.

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

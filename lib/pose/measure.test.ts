import { describe, expect, it } from "vitest";
import { estimateMeasurements } from "./measure";
import { POSE, type PoseLandmark } from "./landmarks";

const W = 800;
const H = 1200;

/**
 * Builds a synthetic frontal standing pose. Coordinates are normalised, so a
 * shoulder span of 0.34 means 34% of image width.
 *
 * Defaults are proportioned to a real 178cm adult filling an 800x1200 frame:
 * shoulder breadth is roughly 0.23x stature, which at this scale works out to
 * ~34% of image width. Using an arbitrary smaller span produces a body the
 * model correctly rejects as implausible, which makes for a misleading fixture.
 */
function pose(
  overrides: {
    shoulderSpan?: number;
    hipSpan?: number;
    eyeY?: number;
    heelY?: number;
    shoulderZDiff?: number;
    visibility?: number;
  } = {},
): PoseLandmark[] {
  const {
    shoulderSpan = 0.34,
    hipSpan = 0.27,
    eyeY = 0.06,
    heelY = 0.97,
    shoulderZDiff = 0,
    visibility = 0.99,
  } = overrides;

  const landmarks: PoseLandmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility,
  }));

  const set = (i: number, x: number, y: number, z = 0) => {
    landmarks[i] = { x, y, z, visibility };
  };

  // Mirroring matters. Facing the camera, the subject's own LEFT lands on the
  // viewer's right, so LEFT_* carries the larger x. This fixture originally had
  // it the other way round — i.e. it described someone facing away — which went
  // unnoticed until real photos were run through the calibration harness.
  // Verified against MediaPipe output: front view gave LEFT_SHOULDER.x 0.562 vs
  // RIGHT_SHOULDER.x 0.435; a back view inverted it.
  set(POSE.LEFT_EYE, 0.53, eyeY);
  set(POSE.RIGHT_EYE, 0.47, eyeY);
  set(POSE.LEFT_EAR, 0.55, eyeY + 0.005);
  set(POSE.RIGHT_EAR, 0.45, eyeY + 0.005);
  set(POSE.LEFT_SHOULDER, 0.5 + shoulderSpan / 2, 0.22, 0);
  set(POSE.RIGHT_SHOULDER, 0.5 - shoulderSpan / 2, 0.22, shoulderZDiff);
  set(POSE.LEFT_HIP, 0.5 + hipSpan / 2, 0.52);
  set(POSE.RIGHT_HIP, 0.5 - hipSpan / 2, 0.52);
  set(POSE.LEFT_HEEL, 0.47, heelY);
  set(POSE.RIGHT_HEEL, 0.53, heelY);
  set(POSE.LEFT_ANKLE, 0.47, heelY - 0.01);
  set(POSE.RIGHT_ANKLE, 0.53, heelY - 0.01);

  return landmarks;
}

const base = { heightCm: 178, imageWidth: W, imageHeight: H };

describe("estimateMeasurements", () => {
  it("produces plausible measurements for a typical frontal pose", () => {
    const result = estimateMeasurements({ landmarks: pose(), ...base });
    expect(result.ok).toBe(true);
    expect(result.measurements.chestCm).toBeGreaterThan(70);
    expect(result.measurements.chestCm).toBeLessThan(130);
    expect(result.measurements.hipCm).toBeGreaterThan(70);
    expect(result.measurements.hipCm).toBeLessThan(130);
  });

  it("never estimates a waist measurement", () => {
    // Waist has no landmark and the widest individual variation; inventing one
    // would be a confident number with no support in the data.
    const result = estimateMeasurements({ landmarks: pose(), ...base });
    expect(result.measurements.waistCm).toBeUndefined();
  });

  it("scales with declared height: a taller person measures larger", () => {
    const short = estimateMeasurements({ landmarks: pose(), ...base, heightCm: 160 });
    const tall = estimateMeasurements({ landmarks: pose(), ...base, heightCm: 195 });
    expect(tall.measurements.chestCm!).toBeGreaterThan(short.measurements.chestCm!);
  });

  it("scales with shoulder span: broader shoulders measure larger", () => {
    const narrow = estimateMeasurements({
      landmarks: pose({ shoulderSpan: 0.3 }),
      ...base,
    });
    const broad = estimateMeasurements({
      landmarks: pose({ shoulderSpan: 0.38 }),
      ...base,
    });
    expect(broad.measurements.chestCm!).toBeGreaterThan(narrow.measurements.chestCm!);
  });

  it("is invariant to image resolution for the same normalised pose", () => {
    const small = estimateMeasurements({
      landmarks: pose(),
      heightCm: 178,
      imageWidth: 400,
      imageHeight: 600,
    });
    const large = estimateMeasurements({
      landmarks: pose(),
      heightCm: 178,
      imageWidth: 1600,
      imageHeight: 2400,
    });
    expect(small.measurements.chestCm).toBeCloseTo(large.measurements.chestCm!, 1);
  });

  describe("quality gates", () => {
    it("rejects a rotated subject rather than reporting a small estimate", () => {
      const result = estimateMeasurements({
        landmarks: pose({ shoulderZDiff: 0.5 }),
        ...base,
      });
      expect(result.ok).toBe(false);
      expect(result.issues).toContain("rotated");
      expect(result.message).toMatch(/face the camera/i);
    });

    it("rejects a subject facing away instead of measuring their back", () => {
      // Regression, gate G8. A real back-view photo was accepted and returned a
      // confident 99.8cm chest. The rotation gate above cannot catch it: someone
      // square-on facing away has the same near-zero shoulder depth difference
      // as someone facing you. Only the left/right x ordering distinguishes them.
      const landmarks = pose();
      const left = landmarks[POSE.LEFT_SHOULDER];
      landmarks[POSE.LEFT_SHOULDER] = landmarks[POSE.RIGHT_SHOULDER];
      landmarks[POSE.RIGHT_SHOULDER] = left;

      const result = estimateMeasurements({ landmarks, ...base });
      expect(result.ok).toBe(false);
      expect(result.issues).toContain("facing_away");
      expect(result.measurements.chestCm).toBeUndefined();
    });

    it("rejects a pose with no visible full body", () => {
      const landmarks = pose();
      // Hide every lower-body scale landmark.
      for (const i of [POSE.LEFT_HEEL, POSE.RIGHT_HEEL, POSE.LEFT_ANKLE, POSE.RIGHT_ANKLE]) {
        landmarks[i] = { ...landmarks[i], visibility: 0.1 };
      }
      const result = estimateMeasurements({ landmarks, ...base });
      expect(result.ok).toBe(false);
      expect(result.issues).toContain("no_full_body");
    });

    it("rejects missing required landmarks", () => {
      const landmarks = pose();
      // @ts-expect-error deliberately removing a landmark
      landmarks[POSE.LEFT_SHOULDER] = undefined;
      const result = estimateMeasurements({ landmarks, ...base });
      expect(result.ok).toBe(false);
      expect(result.issues).toContain("missing_landmarks");
    });

    it("flags low visibility without necessarily failing", () => {
      const result = estimateMeasurements({
        landmarks: pose({ visibility: 0.4 }),
        ...base,
      });
      // Low visibility on scale landmarks means the span cannot be trusted.
      expect(result.ok).toBe(false);
      expect(result.issues).toContain("low_visibility");
    });

    it("requires a declared height", () => {
      const result = estimateMeasurements({
        landmarks: pose(),
        imageWidth: W,
        imageHeight: H,
        heightCm: NaN,
      });
      expect(result.ok).toBe(false);
      expect(result.message).toMatch(/height/i);
    });

    it("rejects an implausible declared height", () => {
      const result = estimateMeasurements({ landmarks: pose(), ...base, heightCm: 40 });
      expect(result.ok).toBe(false);
    });

    it("rejects results that fall outside plausible bounds", () => {
      // An absurdly wide body cannot be real at this height.
      const result = estimateMeasurements({
        landmarks: pose({ shoulderSpan: 0.95, hipSpan: 0.9 }),
        ...base,
      });
      expect(result.ok).toBe(false);
      expect(result.issues).toContain("implausible_result");
    });

    it("returns the plausible subset when only one measurement is bad", () => {
      // Implausible shoulders but a normal hip span: report the hip rather than
      // discarding a usable measurement. The fit engine handles partial input.
      const result = estimateMeasurements({
        landmarks: pose({ shoulderSpan: 0.95 }),
        ...base,
      });
      expect(result.ok).toBe(true);
      expect(result.measurements.chestCm).toBeUndefined();
      expect(result.measurements.hipCm).toBeDefined();
    });
  });
});

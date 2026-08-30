import { describe, expect, it } from "vitest";
import {
  analyse,
  caveatLine,
  MIN_SUBJECTS_FOR_MULTIPLIER_CHANGE,
  suggestedMultiplier,
  type CalibrationSample,
} from "./calibration";

/** A photo whose chest estimate misses the tape measurement by `errorCm`. */
function sample(
  subject: string,
  actualChest: number,
  errorCm: number,
  label = "front",
): CalibrationSample {
  return {
    subject,
    label,
    actual: { chestCm: actualChest },
    estimated: { chestCm: actualChest + errorCm },
  };
}

/** `count` distinct people, each missed by the same amount. */
function people(count: number, errorCm: number, actualChest = 100) {
  return Array.from({ length: count }, (_, i) =>
    sample(`person-${i}`, actualChest, errorCm),
  );
}

describe("analyse", () => {
  it("reports no data when nothing is paired", () => {
    const stats = analyse([], "chestCm");
    expect(stats.recommendation).toBe("no-data");
    expect(stats.n).toBe(0);
  });

  it("ignores photos missing a tape measurement", () => {
    const stats = analyse(
      [
        sample("a", 100, -4),
        { subject: "b", label: "front", actual: {}, estimated: { chestCm: 98 } },
      ],
      "chestCm",
    );
    expect(stats.n).toBe(1);
  });

  it("signs the error so under-reading is negative", () => {
    // The documented bias is under-reading width, which recommends sizes that
    // are too small. The sign has to survive into the report.
    const stats = analyse([sample("a", 100, -6)], "chestCm");
    expect(stats.meanErrorCm).toBe(-6);
    expect(stats.meanAbsErrorCm).toBe(6);
  });

  it("keeps the worst miss, not just the average", () => {
    const stats = analyse(
      [sample("a", 100, -1), sample("b", 100, -1), sample("c", 100, -14)],
      "chestCm",
    );
    expect(stats.worstErrorCm).toBe(-14);
  });
});

describe("the subject-count guard", () => {
  it("counts distinct people, not photos", () => {
    // Six photos of one person: precise about that person, silent about the
    // population. This is the exact shape of the calibration set on hand.
    const stats = analyse(
      [
        sample("angu", 100, -5, "front"),
        sample("angu", 100, -5, "back"),
        sample("angu", 100, -5, "left"),
        sample("angu", 100, -5, "right"),
        sample("angu", 100, -5, "front-2"),
        sample("angu", 100, -5, "front-3"),
      ],
      "chestCm",
    );
    expect(stats.n).toBe(6);
    expect(stats.subjects).toBe(1);
    expect(stats.recommendation).toBe("insufficient-subjects");
  });

  it("refuses a multiplier change below the subject threshold, however tight the fit", () => {
    // Zero variance across seven people would look conclusive to any naive
    // significance test. It still is not enough bodies.
    const stats = analyse(people(MIN_SUBJECTS_FOR_MULTIPLIER_CHANGE - 1, -8), "chestCm");
    expect(stats.recommendation).toBe("insufficient-subjects");
    expect(stats.rationale).toMatch(/caveat instead/i);
  });

  it("directs the reader to the caveat rather than leaving them nowhere", () => {
    const stats = analyse([sample("angu", 100, -5)], "chestCm");
    expect(stats.rationale).toMatch(/report the measured error/i);
  });
});

describe("significance", () => {
  it("does not claim bias when the interval spans zero", () => {
    const noisy = [12, -11, 9, -13, 10, -8, 14, -12, 7, -9].map((e, i) =>
      sample(`person-${i}`, 100, e),
    );
    const stats = analyse(noisy, "chestCm");
    expect(stats.subjects).toBeGreaterThanOrEqual(MIN_SUBJECTS_FOR_MULTIPLIER_CHANGE);
    expect(stats.recommendation).toBe("no-significant-bias");
  });

  it("recommends a change when enough people agree on the direction", () => {
    const consistent = [-6, -7, -5, -8, -6, -7, -6, -5, -7, -6].map((e, i) =>
      sample(`person-${i}`, 100, e),
    );
    const stats = analyse(consistent, "chestCm");
    expect(stats.recommendation).toBe("adjust-multiplier");
    // Estimates read ~6.3cm small on a 100cm chest, so the constant scales up.
    expect(stats.correctionFactor).toBeGreaterThan(1);
  });

  it("uses a t interval, so three noisy points are not treated as conclusive", () => {
    // With 1.96 instead of t(df=2)=4.303 this sample reads as significant.
    const stats = analyse(
      [sample("a", 100, -5), sample("b", 100, -1), sample("c", 100, -9)],
      "chestCm",
    );
    expect(stats.ci95HalfWidthCm).toBeGreaterThan(Math.abs(stats.meanErrorCm));
  });
});

describe("suggestedMultiplier", () => {
  it("leaves the constant untouched unless a change was recommended", () => {
    const stats = analyse([sample("angu", 100, -20)], "chestCm");
    expect(suggestedMultiplier(2.45, stats)).toBe(2.45);
  });

  it("scales the constant by the measured correction when justified", () => {
    const stats = analyse(people(10, -10), "chestCm");
    expect(stats.recommendation).toBe("adjust-multiplier");
    // Estimated 90 against an actual 100 → the constant needs to grow by 1/0.9.
    expect(suggestedMultiplier(2.45, stats)).toBeCloseTo(2.45 * (100 / 90), 2);
  });
});

describe("caveatLine", () => {
  it("states the direction, the sample and the worst case", () => {
    const line = caveatLine(analyse([sample("angu", 100, -5), sample("angu", 100, -11)], "chestCm"))!;
    expect(line).toMatch(/8\.0cm small/);
    expect(line).toMatch(/2 photos, 1 person/);
    expect(line).toMatch(/worst miss 11\.0cm/);
  });

  it("says nothing when there is nothing measured", () => {
    expect(caveatLine(analyse([], "chestCm"))).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { recommendSize } from "./recommend";
import { getSizeChart, SIZE_CHARTS } from "./sizeCharts";
import type { SizeChart } from "./types";

const mens = getSizeChart("seasalt-mens")!;
const womens = getSizeChart("boden-womens")!;

describe("recommendSize", () => {
  it("picks the size whose band contains the chest measurement", () => {
    const result = recommendSize({ measurements: { chestCm: 98 }, chart: mens });
    expect(result.recommendedSize).toBe("M");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("explains the recommendation in terms of the actual numbers", () => {
    const result = recommendSize({ measurements: { chestCm: 98 }, chart: mens });
    expect(result.reason).toContain("98cm");
    expect(result.reason).toContain("M");
    expect(result.reason).toContain("96");
  });

  it("weights chest above waist when they disagree", () => {
    // Chest says M (96-101), waist says XL (91-96).
    const result = recommendSize({
      measurements: { chestCm: 99, waistCm: 94 },
      chart: mens,
    });
    expect(result.recommendedSize).toBe("M");
  });

  it("lowers confidence when measurements disagree", () => {
    const agree = recommendSize({
      measurements: { chestCm: 98, waistCm: 83 },
      chart: mens,
    });
    const disagree = recommendSize({
      measurements: { chestCm: 98, waistCm: 94 },
      chart: mens,
    });
    expect(disagree.confidence).toBeLessThan(agree.confidence);
  });

  it("offers an alternative size when the shopper is on a boundary", () => {
    // 95cm sits in the gap between S (89-94) and M (96-101), equidistant.
    const result = recommendSize({ measurements: { chestCm: 95 }, chart: mens });
    expect(result.alternativeSize).not.toBeNull();
    expect([result.recommendedSize, result.alternativeSize].sort()).toEqual(["M", "S"]);
  });

  it("does not offer an alternative when the match is unambiguous", () => {
    // Dead centre of M.
    const result = recommendSize({ measurements: { chestCm: 98.5 }, chart: mens });
    expect(result.alternativeSize).toBeNull();
  });

  describe("fit preference", () => {
    it("sizes up for a relaxed fit", () => {
      const regular = recommendSize({ measurements: { chestCm: 100 }, chart: mens });
      const relaxed = recommendSize({
        measurements: { chestCm: 100 },
        chart: mens,
        fitPreference: "relaxed",
      });
      expect(regular.recommendedSize).toBe("M");
      expect(relaxed.recommendedSize).toBe("L");
    });

    it("sizes down for a fitted preference", () => {
      const regular = recommendSize({ measurements: { chestCm: 96.5 }, chart: mens });
      const fitted = recommendSize({
        measurements: { chestCm: 96.5 },
        chart: mens,
        fitPreference: "fitted",
      });
      expect(regular.recommendedSize).toBe("M");
      expect(fitted.recommendedSize).toBe("S");
    });

    it("mentions the preference in the reason", () => {
      const result = recommendSize({
        measurements: { chestCm: 98 },
        chart: mens,
        fitPreference: "relaxed",
      });
      expect(result.reason).toContain("relaxed");
    });

    it("states the eased figure when easing lands in a gap between bands", () => {
      // 98 + 4 (relaxed) = 102, which falls in Seasalt's M/L gap. The reason
      // must still name the preference and must not claim 98cm is "above" M.
      const result = recommendSize({
        measurements: { chestCm: 98 },
        chart: mens,
        fitPreference: "relaxed",
      });
      expect(result.reason).toContain("relaxed");
      expect(result.reason).toContain("102cm");
      expect(result.reason).not.toMatch(/Your chest \(98cm\) is above/);
    });

    it("shows both the raw and eased figure so the reason is not self-contradictory", () => {
      // 98 eases to 96 and matches M (96-101). Quoting only 98 against that
      // band would read as a contradiction at the boundary.
      const result = recommendSize({
        measurements: { chestCm: 98 },
        chart: mens,
        fitPreference: "fitted",
      });
      expect(result.reason).toContain("98cm");
      expect(result.reason).toContain("96cm");
    });
  });

  describe("photo-estimated measurements", () => {
    it("always attaches the bias caveat and never suppresses it", () => {
      const result = recommendSize({
        measurements: { chestCm: 98 },
        chart: mens,
        measurementSource: "estimated_from_photo",
      });
      expect(result.estimateCaveat).toBeDefined();
      expect(result.estimateCaveat).toMatch(/under-read/i);
    });

    it("carries lower confidence than declared measurements", () => {
      const declared = recommendSize({ measurements: { chestCm: 98 }, chart: mens });
      const estimated = recommendSize({
        measurements: { chestCm: 98 },
        chart: mens,
        measurementSource: "estimated_from_photo",
      });
      expect(estimated.confidence).toBeLessThan(declared.confidence);
    });

    it("omits the caveat for declared measurements", () => {
      const result = recommendSize({ measurements: { chestCm: 98 }, chart: mens });
      expect(result.estimateCaveat).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("returns no recommendation when given no measurements", () => {
      const result = recommendSize({ measurements: {}, chart: mens });
      expect(result.recommendedSize).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it("flags being off the chart and still names the nearest size", () => {
      const result = recommendSize({ measurements: { chestCm: 150 }, chart: mens });
      expect(result.outOfChartRange).toBe(true);
      expect(result.recommendedSize).toBe("XXXL");
      expect(result.confidence).toBeLessThan(0.4);
      expect(result.reason).toMatch(/outside this chart/i);
    });

    it("picks the nearest size when off-chart, even against a much wider band", () => {
      // Boden's UK 4 is an open-ended band (wide); UK 22 is narrow but far
      // closer. Normalising distance by band width used to rank UK 4 first for
      // a 135cm bust, which is the worst kind of wrong answer here.
      const result = recommendSize({ measurements: { chestCm: 135 }, chart: womens });
      expect(result.outOfChartRange).toBe(true);
      expect(result.recommendedSize).toBe("UK 22");
    });

    it("does not report off-chart for a measurement falling in a band gap", () => {
      // Seasalt jumps 94 -> 96 at the S/M boundary. Someone at 95 is squarely on
      // the chart; saying otherwise is both wrong and alarming.
      const result = recommendSize({ measurements: { chestCm: 95 }, chart: mens });
      expect(result.outOfChartRange).toBeUndefined();
      expect(result.reason).not.toMatch(/outside this chart/i);
    });

    it("handles being below the smallest size", () => {
      const result = recommendSize({ measurements: { chestCm: 50 }, chart: mens });
      expect(result.outOfChartRange).toBe(true);
      expect(result.recommendedSize).toBe("S");
    });

    it("lowers confidence when only one measurement is supplied", () => {
      const one = recommendSize({ measurements: { chestCm: 98 }, chart: mens });
      const three = recommendSize({
        measurements: { chestCm: 98, waistCm: 83, hipCm: 0 },
        chart: mens,
      });
      // hipCm: 0 is ignored as not supplied, so this is a two-measurement case.
      expect(one.confidence).toBeLessThan(three.confidence);
    });

    it("ignores chart rows that omit the supplied measurement", () => {
      // Mens chart has no hip ranges; a hip-only request cannot be scored.
      const result = recommendSize({ measurements: { hipCm: 95 }, chart: mens });
      expect(result.scores.every((s) => s.score === 0)).toBe(true);
    });

    it("works on a chart with a different size vocabulary", () => {
      const result = recommendSize({
        measurements: { chestCm: 93, waistCm: 75, hipCm: 100 },
        chart: womens,
      });
      expect(result.recommendedSize).toBe("UK 12");
    });
  });

  describe("provenance", () => {
    it("propagates an unverified flag so placeholders cannot pass as real", () => {
      const placeholder: SizeChart = {
        ...mens,
        verified: false,
        source: "Made-up sizing (placeholder)",
      };
      const result = recommendSize({ measurements: { chestCm: 98 }, chart: placeholder });
      expect(result.sizeChartVerified).toBe(false);
      expect(result.sizeChartSource).toMatch(/placeholder/i);
    });

    it("ships only verified charts", () => {
      expect(SIZE_CHARTS.every((c) => c.verified)).toBe(true);
    });

    it("reports the real Seasalt menswear chart as verified", () => {
      const result = recommendSize({ measurements: { chestCm: 98 }, chart: mens });
      expect(result.sizeChartVerified).toBe(true);
      expect(result.sizeChartSource).toMatch(/Seasalt/);
    });

    it("reports the real Boden chart as verified and names its source", () => {
      const result = recommendSize({ measurements: { chestCm: 92 }, chart: womens });
      expect(result.sizeChartVerified).toBe(true);
      expect(result.sizeChartSource).toMatch(/Boden/);
    });

    it("scores higher confidence on a verified chart than a placeholder", () => {
      const verified = recommendSize({ measurements: { chestCm: 92 }, chart: womens });
      const placeholder = recommendSize({
        measurements: { chestCm: 92 },
        chart: { ...womens, verified: false },
      });
      expect(verified.confidence).toBeGreaterThan(placeholder.confidence);
    });

    it("never reports full certainty, even on a perfect verified match", () => {
      // Garment cut varies within a size regardless of measurement fit; claiming
      // certainty is an advertising-standards risk (docs/03-compliance-uk.md §5).
      const realChart: SizeChart = { ...womens, verified: true, source: "ACME Ltd" };
      const result = recommendSize({
        measurements: { chestCm: 92.5, waistCm: 74.5, hipCm: 99.5 },
        chart: realChart,
      });
      expect(result.confidence).toBeLessThan(1);
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    });

    it("reports verified when the chart is real", () => {
      const realChart: SizeChart = { ...mens, verified: true, source: "ACME Ltd" };
      const result = recommendSize({ measurements: { chestCm: 98 }, chart: realChart });
      expect(result.sizeChartVerified).toBe(true);
    });
  });
});

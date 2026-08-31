import type { ChartAudience, SizeChart } from "./types";

/**
 * How each audience is named to a shopper. Lives here rather than in a
 * component because both the chart picker and the mismatch message need it,
 * and two copies would drift.
 */
export const AUDIENCE_LABEL: Record<ChartAudience, string> = {
  womens: "Women's",
  mens: "Men's",
};

/**
 * Size charts.
 *
 * Charts carry a `verified` flag that propagates all the way to the API response
 * and the UI. Anything not sourced from a real retailer's published BODY
 * measurements must stay `verified: false` so it cannot be presented as
 * authoritative.
 *
 * Ranges are inclusive and expressed in centimetres.
 */

/**
 * Boden UK womenswear — real published body measurements.
 *
 * Source:   https://www.boden.com/pages/womens-size-fit-chart
 * Retrieved: 2026-08-29
 *
 * Confirmed BODY measurements, not garment measurements. The page's own
 * instructions are unambiguous: "BUST: Measure under your arms, across the
 * fullest part of your bust", "WAIST: Measure your natural waistline",
 * "HIP: Measure around the fullest part of your bottom at the top of your leg."
 * That distinction is the single most common source of sizing errors, which is
 * why it is recorded here rather than assumed.
 *
 * One deviation from the source: Boden states UK 4 as an open-ended "up to 82cm"
 * (and equivalents for waist/hip). An open lower bound cannot be scored, so a
 * floor is applied. The floor is a scoring artefact, not Boden data — anyone
 * below it is reported as off-chart, which is correct, since Boden does not sell
 * smaller than UK 4.
 */
const bodenWomens: SizeChart = {
  id: "boden-womens",
  source: "Boden UK womenswear, retrieved 2026-08-29",
  audience: "womens",
  verified: true,
  entries: [
    { size: "UK 4", chestCm: [60, 82], waistCm: [45, 64], hipCm: [65, 87] },
    { size: "UK 6", chestCm: [82, 84], waistCm: [64, 66], hipCm: [87, 89] },
    { size: "UK 8", chestCm: [84, 86.5], waistCm: [66, 68.5], hipCm: [89, 91.5] },
    { size: "UK 10", chestCm: [87, 89], waistCm: [69, 71], hipCm: [92, 94] },
    { size: "UK 12", chestCm: [90, 94], waistCm: [72, 76], hipCm: [95, 99] },
    { size: "UK 14", chestCm: [95, 99], waistCm: [77, 81], hipCm: [100, 104] },
    { size: "UK 16", chestCm: [100, 104], waistCm: [82, 86], hipCm: [105, 109] },
    { size: "UK 18", chestCm: [105, 109], waistCm: [87, 91], hipCm: [110, 114] },
    { size: "UK 20", chestCm: [110, 115], waistCm: [92, 97], hipCm: [115, 120] },
    { size: "UK 22", chestCm: [116, 121], waistCm: [98, 103], hipCm: [121, 126] },
  ],
};

/**
 * Seasalt Cornwall menswear — real published body measurements.
 *
 * Source:    https://www.seasaltcornwall.com/size-guide
 * Retrieved: 2026-08-29
 *
 * Confirmed BODY measurements. The men's table has its own "How to measure"
 * block directly beneath it: "Chest: Measure a full circumference around the
 * fullest part of the chest including the shoulder blades", "Waist: Measure a
 * full circumference around the natural waistline." The womenswear section on
 * the same page carries a separate block, so this wording is specific to the
 * men's chart rather than inherited.
 *
 * Note the deliberate gaps between bands (S ends 94, M starts 96). They are in
 * the source, not a transcription error. `outOfChartRange` tests the chart's
 * overall span precisely so a shopper landing in a gap is not told they are off
 * the chart.
 *
 * No hip measurements: Seasalt publishes hips for womenswear only.
 */
const seasaltMens: SizeChart = {
  id: "seasalt-mens",
  source: "Seasalt Cornwall menswear, retrieved 2026-08-29",
  audience: "mens",
  verified: true,
  entries: [
    { size: "S", chestCm: [89, 94], waistCm: [74, 79] },
    { size: "M", chestCm: [96, 101], waistCm: [81, 86] },
    { size: "L", chestCm: [104, 109], waistCm: [89, 94] },
    { size: "XL", chestCm: [111, 116], waistCm: [96, 101] },
    { size: "XXL", chestCm: [119, 124], waistCm: [104, 109] },
    { size: "XXXL", chestCm: [127, 132], waistCm: [111, 117] },
  ],
};

export const SIZE_CHARTS: SizeChart[] = [bodenWomens, seasaltMens];

/** The chart the demo opens on. Deliberately the verified one. */
export const DEFAULT_SIZE_CHART_ID = bodenWomens.id;

export function getSizeChart(id: string): SizeChart | undefined {
  return SIZE_CHARTS.find((chart) => chart.id === id);
}

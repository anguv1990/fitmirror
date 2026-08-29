import type { SizeChart } from "./types";

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
 * ⚠️ PLACEHOLDER — generic UK menswear ranges, not a real brand's chart.
 *
 * Gate G5 is only half cleared: a verified womenswear chart is in place, but no
 * equivalent menswear chart has been sourced. Boden does not publish its men's
 * body measurements at a stable page, and guessing was rejected in favour of
 * leaving this explicitly flagged.
 *
 * To finish clearing G5: source a real published men's chart, confirm it states
 * BODY rather than GARMENT measurements, replace these entries, and set
 * `verified: true` with the brand and retrieval date in `source`.
 */
const genericMens: SizeChart = {
  id: "uk-mens-tops",
  source: "Generic UK menswear sizing (placeholder — see gate G5)",
  verified: false,
  entries: [
    { size: "XS", chestCm: [86, 91], waistCm: [71, 76] },
    { size: "S", chestCm: [91, 96], waistCm: [76, 81] },
    { size: "M", chestCm: [96, 101], waistCm: [81, 86] },
    { size: "L", chestCm: [101, 106], waistCm: [86, 91] },
    { size: "XL", chestCm: [106, 111], waistCm: [91, 96] },
    { size: "XXL", chestCm: [111, 116], waistCm: [96, 101] },
  ],
};

/** Verified charts first, so the default is a real one. */
export const SIZE_CHARTS: SizeChart[] = [bodenWomens, genericMens];

/** The chart the demo opens on. Deliberately the verified one. */
export const DEFAULT_SIZE_CHART_ID = bodenWomens.id;

export function getSizeChart(id: string): SizeChart | undefined {
  return SIZE_CHARTS.find((chart) => chart.id === id);
}

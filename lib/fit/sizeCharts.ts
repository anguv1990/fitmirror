import type { SizeChart } from "./types";

/**
 * Size charts.
 *
 * ⚠️ GATE G5 (docs/04-prerequisite-gate.md): these are generic UK high-street
 * ranges, NOT a real brand's published chart. Every entry is marked
 * `verified: false`, and the API echoes that flag so nothing downstream can
 * present placeholder data as authoritative.
 *
 * To clear G5: obtain a real published chart, confirm it states BODY
 * measurements rather than GARMENT measurements, replace the entries, and set
 * `verified: true` with the brand named in `source`.
 *
 * Ranges are inclusive and expressed in centimetres.
 */
export const SIZE_CHARTS: SizeChart[] = [
  {
    id: "uk-womens-tops",
    source: "Generic UK womenswear sizing (placeholder — see gate G5)",
    verified: false,
    entries: [
      { size: "UK 6", chestCm: [76, 80], waistCm: [58, 62], hipCm: [83, 87] },
      { size: "UK 8", chestCm: [80, 85], waistCm: [62, 67], hipCm: [87, 92] },
      { size: "UK 10", chestCm: [85, 90], waistCm: [67, 72], hipCm: [92, 97] },
      { size: "UK 12", chestCm: [90, 95], waistCm: [72, 77], hipCm: [97, 102] },
      { size: "UK 14", chestCm: [95, 100], waistCm: [77, 82], hipCm: [102, 107] },
      { size: "UK 16", chestCm: [100, 105], waistCm: [82, 87], hipCm: [107, 112] },
      { size: "UK 18", chestCm: [105, 110], waistCm: [87, 92], hipCm: [112, 117] },
      { size: "UK 20", chestCm: [110, 115], waistCm: [92, 97], hipCm: [117, 122] },
    ],
  },
  {
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
  },
];

export function getSizeChart(id: string): SizeChart | undefined {
  return SIZE_CHARTS.find((chart) => chart.id === id);
}

import { AUDIENCE_LABEL } from "./fit/sizeCharts";
import type { SizeChart } from "./fit/types";
import type { Garment } from "./types";

/**
 * Whether a size chart can size a given garment at all.
 *
 * This sits at the lib root rather than inside `lib/fit/` on purpose:
 * `lib/fit/` does not import the garment catalogue, and keeping the fit engine
 * free of it is what lets the recommendation run with no product context. The
 * coupling belongs above both, next to `garmentImage.ts` which bridges the same
 * two worlds.
 *
 * **The rule is deliberately narrow.** Only pairings the data actually
 * contradicts are reported. Both charts carry tops, so a `top` says nothing
 * about which chart applies, and guessing would be worse than staying quiet —
 * the same reasoning that removed the hip estimate rather than retuning it.
 */

/** Categories that a chart of the given audience cannot size. */
const IMPOSSIBLE: Partial<Record<SizeChart["audience"], Garment["category"][]>> = {
  // Seasalt's menswear chart publishes chest and waist only, and no menswear
  // chart carries dress sizing. This is an absence in the source, not a guess.
  mens: ["dress"],
};

/**
 * A plain-English reason the pairing cannot work, or `null` when it can — or
 * when the data does not support an opinion, which is not the same thing.
 */
export function chartMismatch(
  garment: Pick<Garment, "name" | "category"> | null | undefined,
  chart: Pick<SizeChart, "audience"> | null | undefined,
): string | null {
  if (!garment || !chart) return null;
  if (!IMPOSSIBLE[chart.audience]?.includes(garment.category)) return null;

  // Names the audience rather than `chart.source`, which carries a retrieval
  // date ("…, retrieved 2026-08-29") that reads badly mid-sentence.
  // Also avoids pluralising the category: "dress" happens to take "es", but
  // "bottom" would not, and a grammar bug in a caveat undermines it.
  const audience = AUDIENCE_LABEL[chart.audience].toLowerCase();
  return (
    `${garment.name} is a ${garment.category}, and a ${audience} size chart ` +
    `does not publish ${garment.category} sizing. Pick a different chart to ` +
    `get a size.`
  );
}

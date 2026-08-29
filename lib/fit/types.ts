/**
 * Fit recommendation domain types.
 *
 * This is the "hero" subsystem: it answers "what size should I order?", which is
 * where return-rate reduction actually comes from. It is deliberately independent
 * of the try-on renderer — it makes no network calls, costs nothing to run, and
 * works with no API credentials.
 */

/** How a shopper wants the garment to sit. Shifts the recommendation by design. */
export type FitPreference = "fitted" | "regular" | "relaxed";

/** Where the measurements came from. Drives the caveat shown to the shopper. */
export type MeasurementSource = "declared" | "estimated_from_photo";

/**
 * Body measurements in centimetres. Body, NOT garment measurements — the two
 * differ by the manufacturer's ease allowance, and confusing them is the single
 * most common source of sizing errors.
 */
export interface BodyMeasurements {
  chestCm?: number;
  waistCm?: number;
  hipCm?: number;
}

/** One row of a brand size chart, as inclusive body-measurement ranges. */
export interface SizeChartEntry {
  size: string;
  chestCm?: [number, number];
  waistCm?: [number, number];
  hipCm?: [number, number];
}

export interface SizeChart {
  id: string;
  /** Brand or standard this chart came from. Shown to the shopper for trust. */
  source: string;
  /** Ordered smallest to largest. Order matters: adjacency drives "size up/down". */
  entries: SizeChartEntry[];
  /**
   * True when these are real published body measurements from a named brand.
   * False means placeholder data that must not be presented as authoritative.
   */
  verified: boolean;
}

export interface FitRequest {
  measurements: BodyMeasurements;
  sizeChartId: string;
  fitPreference?: FitPreference;
  measurementSource?: MeasurementSource;
}

/** Per-size diagnostic detail. Retained so the recommendation is auditable. */
export interface SizeScore {
  size: string;
  /** 0-1, higher is better. */
  score: number;
  /** Per-measurement position within the size band: 0 = at min, 1 = at max. */
  positions: Partial<Record<keyof BodyMeasurements, number>>;
  /** Measurements that fall outside this size's range entirely. */
  outOfRange: (keyof BodyMeasurements)[];
}

export interface FitRecommendation {
  recommendedSize: string | null;
  /** 0-1. Low values mean the shopper sits between sizes or off the chart. */
  confidence: number;
  /** Plain-English justification. The explanation IS the product. */
  reason: string;
  /** The next-best size, when the call is close. */
  alternativeSize: string | null;
  measurementSource: MeasurementSource;
  /** Present only for photo-derived measurements. Never suppressed. */
  estimateCaveat?: string;
  /** Set when the shopper is outside the chart's range entirely. */
  outOfChartRange?: boolean;
  scores: SizeScore[];
  sizeChartSource: string;
  /** Mirrors SizeChart.verified so callers can flag placeholder data. */
  sizeChartVerified: boolean;
}

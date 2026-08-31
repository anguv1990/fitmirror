/**
 * The body-measurement seam.
 *
 * Mirrors `lib/tryon/` for the measurement half of the product: everything above
 * this interface is provider-agnostic, so swapping our own estimator for a
 * vendor like 3DLOOK Mobile Tailor is one new file plus one registry line.
 *
 * ## Why the input looks the way it does
 *
 * The shape is taken from what commercial scanners actually require, so adopting
 * one later does not force a change here:
 *
 * - **`heightCm` is mandatory, for every provider, including the paid ones.**
 *   A photograph has no absolute scale — a distant adult and a nearby doll
 *   project identically. 3DLOOK asks for height, weight and gender for exactly
 *   this reason. Any design promising measurements from a bare photo is wrong.
 * - **A side photo is accepted**, because width alone cannot give a
 *   circumference. Front-only providers infer it from population ratios, which
 *   is the root of the known under-read bias (`docs/03-compliance-uk.md` §6).
 *
 * See `docs/07-body-measurement-buy-vs-build.md` for the evaluation behind this.
 */

/** An image the provider can read: a data URL or an object URL. */
export type ImageSource = string;

/**
 * Measurements a provider may return. Deliberately wider than the three the fit
 * engine uses today, so a richer provider is not squeezed through a narrow type.
 */
export type MeasurementKey =
  | "chestCm"
  | "waistCm"
  | "hipCm"
  | "shoulderCm"
  | "neckCm"
  | "sleeveCm"
  | "inseamCm"
  | "thighCm";

export interface MeasurementInput {
  /**
   * Declared stature in centimetres. Required — see the note above. Never
   * inferred, and never silently defaulted.
   */
  heightCm: number;
  frontImage: ImageSource;
  /** Optional. Providers that can use depth will; ours currently cannot. */
  sideImage?: ImageSource;
  /** Optional context some vendors condition their model on. */
  weightKg?: number;
  /**
   * Self-reported, optional, and never inferred from the image. Inferring it
   * would be a characteristic derived from a body photo, which is a different
   * and much worse privacy position than accepting one the shopper offered.
   */
  reportedGender?: "female" | "male" | "unspecified";
}

/**
 * How much a returned number can be trusted.
 *
 * `unreliable` exists so a provider can report a figure it knows is suspect
 * rather than choosing between silence and false confidence. Values marked
 * `unreliable` are excluded from the fit recommendation by default.
 */
export type MeasurementConfidence = "measured" | "estimated" | "unreliable";

export interface MeasuredValue {
  valueCm: number;
  confidence: MeasurementConfidence;
  /** Why it is not `measured`. Travels to the UI; never suppressed. */
  note?: string;
}

export interface MeasurementResult {
  ok: boolean;
  /** Which provider produced this. */
  provider: string;
  values: Partial<Record<MeasurementKey, MeasuredValue>>;
  /** Machine-readable quality problems, e.g. "facing_away". */
  issues: string[];
  /** Human-readable explanation of the first blocking issue. */
  message?: string;
  /**
   * Whether the images left the device to produce this result. Mirrors the
   * provider's disclosure record so the UI can state it at the point of use,
   * not only in the privacy notice.
   */
  photoLeftDevice: boolean;
}

export interface MeasurementProvider {
  readonly name: string;
  /** Where this provider executes. Decides whether images are transmitted. */
  readonly runsOn: "browser" | "server";
  /** True when the provider cannot produce a result without a side photo. */
  readonly requiresSideImage: boolean;
  measure(input: MeasurementInput): Promise<MeasurementResult>;
}

/** Thrown when a provider is selected but not configured (missing key, etc). */
export class MeasurementConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MeasurementConfigError";
  }
}

/**
 * Narrow a provider result down to what the fit engine consumes.
 *
 * `unreliable` values are dropped unless explicitly asked for. A number we have
 * evidence is wrong should not quietly move a size recommendation — the fit
 * engine already handles partial measurements by lowering confidence, which is
 * the honest outcome.
 */
export function toBodyMeasurements(
  result: MeasurementResult,
  { includeUnreliable = false }: { includeUnreliable?: boolean } = {},
): { chestCm?: number; waistCm?: number; hipCm?: number } {
  const out: { chestCm?: number; waistCm?: number; hipCm?: number } = {};
  for (const key of ["chestCm", "waistCm", "hipCm"] as const) {
    const value = result.values[key];
    if (!value) continue;
    if (value.confidence === "unreliable" && !includeUnreliable) continue;
    out[key] = value.valueCm;
  }
  return out;
}

/** Caveats worth showing the shopper, drawn from the values themselves. */
export function measurementNotes(result: MeasurementResult): string[] {
  return Object.values(result.values)
    .map((value) => value?.note)
    .filter((note): note is string => !!note);
}

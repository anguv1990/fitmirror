import { measurementProviderName } from "./config";
import { localMeasurementProvider } from "./local";
import { threeDLookProvider } from "./threedlook";
import type { MeasurementProvider } from "./types";

/**
 * Measurement provider registry. Mirrors `lib/tryon/index.ts`.
 *
 * `local` is the default so a fresh clone measures with no keys and no network,
 * and so the demo survives venue wifi. Adding a provider = implement
 * `MeasurementProvider`, register it here, and add a disclosure record in
 * `lib/compliance/disclosure.ts` — the consent copy then names it automatically.
 */
const PROVIDERS: Record<string, MeasurementProvider> = {
  local: localMeasurementProvider,
  "3dlook": threeDLookProvider,
};

/**
 * Resolve a provider by name. Throws on an unknown value rather than falling
 * back: a silent fallback to `local` would mean the UI promising a vendor scan
 * and quietly delivering a coarse local estimate.
 */
export function getMeasurementProvider(
  name: string = measurementProviderName(),
): MeasurementProvider {
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(
      `Unknown MEASUREMENT_PROVIDER "${name}". Expected one of: ${Object.keys(PROVIDERS).join(", ")}.`,
    );
  }
  return provider;
}

/**
 * Every registered provider name. Exported so the compliance tests can assert
 * each one has a processing disclosure — a provider that might receive a body
 * photo must not be reachable without a stated handling of it.
 */
export function measurementProviderNames(): string[] {
  return Object.keys(PROVIDERS);
}

export { DEFAULT_MEASUREMENT_PROVIDER, measurementProviderName } from "./config";
export { MeasurementConfigError } from "./types";
export type { MeasurementProvider } from "./types";

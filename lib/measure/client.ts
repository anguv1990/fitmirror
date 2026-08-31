import { DEFAULT_MEASUREMENT_PROVIDER } from "./config";
import { localMeasurementProvider } from "./local";
import type { MeasurementInput, MeasurementResult } from "./types";

/**
 * Client-side entry point to the measurement seam.
 *
 * Deliberately does **not** import the provider registry. Pulling that in would
 * bundle the server providers into the browser, and a module that reads an API
 * key has no business in a client bundle. The split is structural instead:
 *
 * - `local` runs here, in the browser, and the photo never leaves the device.
 * - **Anything else transmits by definition**, so it goes to `/api/measure`,
 *   where the credentials live.
 *
 * That is not a shortcut. "Runs in the browser" and "the photo stays on the
 * device" are the same statement, so the routing decision and the privacy claim
 * cannot drift apart.
 */
export async function measureFromClient(
  input: MeasurementInput,
  providerName: string = DEFAULT_MEASUREMENT_PROVIDER,
): Promise<MeasurementResult> {
  if (providerName === localMeasurementProvider.name) {
    return localMeasurementProvider.measure(input);
  }

  const response = await fetch("/api/measure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = await response.json();
  if (!response.ok) {
    return {
      ok: false,
      provider: providerName,
      values: {},
      issues: ["provider_error"],
      message: payload?.error ?? `Measurement failed (${response.status}).`,
      // The request was sent, so the photo did leave the device even though the
      // measurement failed. Saying otherwise would understate what happened.
      photoLeftDevice: true,
    };
  }

  return payload as MeasurementResult;
}

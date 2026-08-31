/**
 * Which measurement provider is configured — and nothing else.
 *
 * Deliberately free of provider imports. Server components and the client
 * dispatcher only need the *name*; importing the registry to get it pulled
 * `local.ts` → `estimator.ts` → the whole MediaPipe bundle into the graph of
 * every page that asks. Keeping the answer in its own module means asking which
 * provider is configured costs nothing.
 */

export const DEFAULT_MEASUREMENT_PROVIDER = "local";

/** The configured provider's name. Safe on both server and client. */
export function measurementProviderName(): string {
  return process.env.MEASUREMENT_PROVIDER?.trim() || DEFAULT_MEASUREMENT_PROVIDER;
}

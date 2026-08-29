import { mockProvider } from "./mock";
import { replicateProvider } from "./replicate";
import type { TryOnProvider } from "./types";

const PROVIDERS: Record<string, TryOnProvider> = {
  mock: mockProvider,
  replicate: replicateProvider,
};

/**
 * Resolve the configured provider. Defaults to `mock` so a fresh clone runs with
 * no environment setup. An unknown value is a config mistake worth failing on
 * rather than silently falling back.
 */
export function getProvider(): TryOnProvider {
  const name = process.env.TRYON_PROVIDER?.trim() || "mock";
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(
      `Unknown TRYON_PROVIDER "${name}". Expected one of: ${Object.keys(PROVIDERS).join(", ")}.`,
    );
  }
  return provider;
}

export type { TryOnProvider };
export { ProviderConfigError } from "./types";

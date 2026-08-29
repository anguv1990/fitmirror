import type { Garment, TryOnRequest, TryOnResult } from "../types";

/**
 * A try-on backend. Everything above this interface — the API route and the UI —
 * is provider-agnostic, so swapping the mock for real inference touches only
 * `lib/tryon/index.ts` and the provider module itself.
 */
export interface TryOnProvider {
  readonly name: string;
  run(request: TryOnRequest, garment: Garment): Promise<TryOnResult>;
}

/** Thrown when a provider is selected but not configured (missing API key, etc). */
export class ProviderConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderConfigError";
  }
}

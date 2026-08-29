import type { Garment, TryOnRequest, TryOnResult } from "../types";
import { ProviderConfigError, type TryOnProvider } from "./types";

/**
 * Real inference via Replicate (IDM-VTON or any model with a compatible
 * signature). Enable with TRYON_PROVIDER=replicate and a REPLICATE_API_TOKEN.
 *
 * Two things must be sorted before this is production-ready, and neither is
 * done here:
 *
 *  1. `garment.art` is inline SVG, but hosted try-on models expect a photograph
 *     of a real garment laid flat. The catalog needs real product images, and
 *     `Garment` needs a field holding a publicly reachable URL for each.
 *  2. Replicate predictions are async and can outlast a serverless request. This
 *     polls inline for simplicity, which is fine locally but should become a
 *     webhook plus a job record before it sees real traffic.
 */
const DEFAULT_VERSION =
  "c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4";

class ReplicateTryOnProvider implements TryOnProvider {
  readonly name = "replicate";

  async run(request: TryOnRequest, garment: Garment): Promise<TryOnResult> {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      throw new ProviderConfigError(
        "TRYON_PROVIDER=replicate but REPLICATE_API_TOKEN is not set. " +
          "Add it to .env.local, or set TRYON_PROVIDER=mock to run offline.",
      );
    }

    const started = Date.now();
    const version = process.env.REPLICATE_TRYON_VERSION || DEFAULT_VERSION;

    const created = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version,
        input: {
          human_img: request.personImage,
          // See caveat (1) above: this needs to be a real garment photo URL.
          garm_img: garmentImageUrl(garment),
          garment_des: garment.name,
        },
      }),
    });

    if (!created.ok) {
      throw new Error(
        `Replicate rejected the prediction (${created.status}): ${await created.text()}`,
      );
    }

    let prediction = await created.json();

    // Poll until terminal. Bounded so a stuck prediction cannot hang forever.
    const deadline = Date.now() + 90_000;
    while (
      prediction.status !== "succeeded" &&
      prediction.status !== "failed" &&
      prediction.status !== "canceled"
    ) {
      if (Date.now() > deadline) {
        throw new Error("Replicate prediction timed out after 90s.");
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const polled = await fetch(prediction.urls.get, {
        headers: { Authorization: `Bearer ${token}` },
      });
      prediction = await polled.json();
    }

    if (prediction.status !== "succeeded") {
      throw new Error(
        `Replicate prediction ${prediction.status}: ${prediction.error ?? "no detail"}`,
      );
    }

    const output = Array.isArray(prediction.output)
      ? prediction.output[0]
      : prediction.output;

    if (typeof output !== "string") {
      throw new Error("Replicate returned no image URL.");
    }

    return {
      image: output,
      garmentId: garment.id,
      provider: this.name,
      elapsedMs: Date.now() - started,
    };
  }
}

function garmentImageUrl(garment: Garment): string {
  throw new ProviderConfigError(
    `Garment "${garment.id}" has no hosted product image. The Replicate provider ` +
      "needs a public URL for the garment; add an `imageUrl` field to the catalog " +
      "in lib/garments.ts and return it here.",
  );
}

export const replicateProvider = new ReplicateTryOnProvider();

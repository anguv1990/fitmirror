import type { Garment } from "./types";

/**
 * Resolving a garment down to something a hosted try-on model can actually use.
 *
 * ## The gap this closes
 *
 * `Garment.art` is inline SVG authored in a `0 0 100 140` box, for the picker
 * thumbnail and the offline mock. Every hosted model — Vertex, Replicate, any of
 * them — expects a **photograph of the garment laid flat**. Nothing in the
 * catalogue satisfies that today, and the mock hides the gap because it
 * composites the artwork directly.
 *
 * ## Why this throws instead of doing its best
 *
 * The failure being prevented is specific: a hosted model handed vector artwork
 * does not error. It returns a plausible, useless render **and bills for it**.
 * Failing before the request is made costs nothing; failing after costs money
 * and produces something that looks like it worked.
 *
 * That is also why `kind` is checked rather than inferred from the file
 * extension. A `.png` of a flat illustration is still an illustration.
 */

/** Thrown when a garment cannot supply an image a provider is able to use. */
export class GarmentImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GarmentImageError";
  }
}

export interface ResolveOptions {
  /**
   * Origin used to absolutise a site-relative path. Providers that fetch the
   * image by URL need one; `localhost` is not reachable from a hosted model, so
   * this must be a public origin in any real deployment.
   */
  origin?: string;
}

/**
 * An absolute URL for the garment image, whatever its kind.
 *
 * Use when a provider merely needs to fetch the bytes. Prefer
 * `requireGarmentPhotograph` for anything that will produce a render a shopper
 * sees.
 */
export function garmentImageUrl(garment: Garment, options: ResolveOptions = {}): string {
  const image = garment.image;
  if (!image) {
    throw new GarmentImageError(
      `Garment "${garment.id}" has no image. Hosted try-on models need a photograph ` +
        `of the garment; garment.art is vector artwork for the thumbnail and the mock, ` +
        `and is not a substitute. See gate G16 in docs/04-prerequisite-gate.md.`,
    );
  }
  return absolutise(image.url, options.origin, garment.id);
}

/**
 * An absolute URL for a garment image that is genuinely a photograph.
 *
 * Rejects illustrations explicitly rather than letting a provider discover the
 * problem in its output.
 */
export function requireGarmentPhotograph(
  garment: Garment,
  options: ResolveOptions = {},
): string {
  const url = garmentImageUrl(garment, options);
  if (garment.image!.kind !== "photograph") {
    throw new GarmentImageError(
      `Garment "${garment.id}" has an image of kind "${garment.image!.kind}", but this ` +
        `provider needs a photograph. A hosted model given an illustration returns a ` +
        `confident, useless render and charges for it.`,
    );
  }
  return url;
}

/** Garments that could be rendered by a provider requiring photography. */
export function garmentsWithPhotography(garments: readonly Garment[]): Garment[] {
  return garments.filter((g) => g.image?.kind === "photograph");
}

function absolutise(url: string, origin: string | undefined, garmentId: string): string {
  if (/^https?:\/\//i.test(url)) return url;

  if (!origin) {
    throw new GarmentImageError(
      `Garment "${garmentId}" has a site-relative image path ("${url}") but no origin was ` +
        `supplied to resolve it. Set PUBLIC_ORIGIN to a publicly reachable base URL — a ` +
        `hosted model cannot fetch localhost.`,
    );
  }

  try {
    return new URL(url, origin).toString();
  } catch {
    throw new GarmentImageError(
      `Could not resolve image path "${url}" for garment "${garmentId}" against origin "${origin}".`,
    );
  }
}

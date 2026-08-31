/**
 * What actually happens to a shopper's photo — as data, not prose.
 *
 * Consent copy and the privacy notice are *generated from* this module rather
 * than written alongside it. Hand-written disclosure text is the thing that goes
 * stale first: someone swaps the provider, and a sentence promising nobody else
 * sees the photo quietly becomes false. Here, swapping the provider changes the
 * copy, or fails the build.
 *
 * See `docs/03-compliance-uk.md` §2 (lawful basis) and §4 (AI transparency).
 */

/** How one processing path treats the photo. */
export interface ProcessingDisclosure {
  /** Provider id, matching the keys of `PROVIDERS` in `lib/tryon/index.ts`. */
  provider: string;
  /** Display name for the engine doing the work. */
  engine: string;
  /** Does the photo leave the shopper's device at all? */
  photoLeavesDevice: boolean;
  /**
   * A named third party that receives the photo, or `null` when nobody outside
   * this application does. Consent must name the processor, so this is the field
   * that makes the consent sentence true.
   */
  processor: string | null;
  /**
   * Where processing happens. `null` means **not established** — which is the
   * honest answer while gate G1 is open. It must never be filled in with an
   * assumption; see `docs/03-compliance-uk.md` §7.
   */
  processingRegion: string | null;
  /** Is the photo written to disk or object storage at any point? */
  photoRetained: boolean;
  /**
   * Is the returned image AI-generated? Drives the visible label required by
   * §4. The mock's output is a fixed overlay, so claiming it was AI-generated
   * would itself be a false disclosure.
   */
  aiGenerated: boolean;
}

/**
 * One entry per measurement provider (`lib/measure/index.ts`).
 *
 * The measurement path used to be a single hard-coded fact, because it could
 * only ever run in the browser. Once a vendor scanner can sit behind the same
 * seam that stopped being true, and a sentence promising the photo never leaves
 * the device became something that depends on configuration.
 */
const MEASUREMENT_DISCLOSURES: Record<string, ProcessingDisclosure> = {
  local: {
    provider: "local",
    engine: "MediaPipe Pose, in your browser",
    photoLeavesDevice: false,
    processor: null,
    processingRegion: "Your own device",
    photoRetained: false,
    aiGenerated: false,
  },
  "3dlook": {
    provider: "3dlook",
    engine: "3DLOOK Mobile Tailor",
    photoLeavesDevice: true,
    processor: "3DLOOK, Inc. (3dlook.ai)",
    // Unconfirmed — gate G12. 3DLOOK publishes no data residency, so no UK or EU
    // claim may be made. Same shape as G1 for Vertex.
    processingRegion: null,
    // They state images are blurred, used only to produce the scan, and deleted
    // immediately. Recorded as their claim; gate G13 is the signed DPA.
    photoRetained: false,
    aiGenerated: false,
  },
};

/**
 * The measurement path's facts. Throws for an unregistered provider, for the
 * same reason as the try-on side: consent cannot be asked for processing that
 * nobody has described.
 */
export function getMeasurementDisclosure(provider: string): ProcessingDisclosure {
  const disclosure = MEASUREMENT_DISCLOSURES[provider];
  if (!disclosure) {
    throw new Error(
      `No processing disclosure for measurement provider "${provider}". ` +
        `Add one to lib/compliance/disclosure.ts before shipping it.`,
    );
  }
  return disclosure;
}

/** Measurement providers with a disclosure on file. */
export function knownMeasurementProviders(): string[] {
  return Object.keys(MEASUREMENT_DISCLOSURES);
}

/**
 * The local, in-browser measurement path.
 *
 * Kept as a named export because it is the one disclosure that is true by
 * construction rather than by configuration.
 */
export const MEASUREMENT_DISCLOSURE: ProcessingDisclosure =
  MEASUREMENT_DISCLOSURES.local;

/**
 * One entry per try-on provider. Keys must match `lib/tryon/index.ts`.
 * `getDisclosure` throws on a missing entry, so a new provider cannot ship
 * without someone stating what it does with the photo.
 */
const DISCLOSURES: Record<string, ProcessingDisclosure> = {
  mock: {
    provider: "mock",
    engine: "A placeholder overlay, running on this site's own server",
    photoLeavesDevice: true,
    processor: null,
    processingRegion: null,
    photoRetained: false,
    aiGenerated: false,
  },
  replicate: {
    provider: "replicate",
    engine: "IDM-VTON on Replicate",
    photoLeavesDevice: true,
    processor: "Replicate, Inc. (replicate.com)",
    processingRegion: null,
    photoRetained: false,
    aiGenerated: true,
  },
};

/**
 * Facts for a provider. Throws rather than guessing: an unknown provider means
 * nobody has said what it does with the photo, and a blank disclosure is worse
 * than a crash on a page that is about to ask someone for consent.
 */
export function getDisclosure(provider: string): ProcessingDisclosure {
  const disclosure = DISCLOSURES[provider];
  if (!disclosure) {
    throw new Error(
      `No processing disclosure for try-on provider "${provider}". ` +
        `Add one to lib/compliance/disclosure.ts before shipping it — consent ` +
        `copy is generated from it and cannot be written without it.`,
    );
  }
  return disclosure;
}

/** Providers that have a disclosure on file. Used by the privacy page. */
export function knownProviders(): string[] {
  return Object.keys(DISCLOSURES);
}

/**
 * The sentences shown next to the consent checkbox.
 *
 * Kept short and specific. "I agree to the terms" is not consent to process a
 * body photo (§2), so each statement names one concrete thing that will happen.
 */
export function consentStatements(
  disclosure: ProcessingDisclosure,
  /**
   * The measurement path, when it differs from the render path. Once a vendor
   * scanner can sit behind the measurement seam, "your photo stays on your
   * device" stops being true of both halves, and consent has to say so.
   */
  measurement?: ProcessingDisclosure,
): string[] {
  const statements: string[] = [];

  statements.push(
    disclosure.photoLeavesDevice
      ? "Your photo is sent to our server to render the garment on it."
      : "Your photo stays on your device.",
  );

  if (measurement) {
    statements.push(
      measurement.photoLeavesDevice
        ? `To measure you, it is also sent to ${measurement.processor ?? "our server"}.`
        : "Measuring you happens entirely on your device — that part of your photo never goes anywhere.",
    );
  }

  if (disclosure.processor) {
    statements.push(
      `It is processed by ${disclosure.processor}, acting for us. They do not keep it.`,
    );
  } else if (disclosure.photoLeavesDevice) {
    statements.push("No third party receives it.");
  }

  statements.push(
    disclosure.photoRetained
      ? "Your photo is stored after the request."
      : "It is held in memory for the length of that one request, then dropped. It is never written to disk, and there is nothing to delete afterwards.",
  );

  statements.push(
    disclosure.processingRegion
      ? `Processing happens in: ${disclosure.processingRegion}.`
      : "Where processing happens has not been confirmed yet, so we are not claiming it stays in the UK.",
  );

  statements.push(
    "You can withdraw at any time, which removes the photo from this page.",
  );

  return statements;
}

/**
 * The label shown on a render. `null` when there is nothing to disclose.
 *
 * Precedence is deliberate: a simulated result is not AI-generated, and saying
 * so would be the more misleading of the two claims.
 */
export function renderLabel(result: {
  simulated?: boolean;
  aiGenerated?: boolean;
}): { text: string; tone: "warn" | "info" } | null {
  if (result.simulated) {
    return {
      text: "Placeholder overlay — not a real fit, and not AI-generated",
      tone: "warn",
    };
  }
  if (result.aiGenerated) {
    return { text: "AI-generated image", tone: "info" };
  }
  return null;
}

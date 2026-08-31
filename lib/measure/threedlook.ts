import {
  MeasurementConfigError,
  type MeasurementInput,
  type MeasurementProvider,
  type MeasurementResult,
} from "./types";

/**
 * 3DLOOK Mobile Tailor — **a worked example, not a working integration.**
 *
 * It exists so the seam has a second, transmitting provider to prove itself
 * against, and so the disclosure, consent and privacy plumbing can be exercised
 * for a path where the photo *does* leave the device. It throws without
 * credentials, by design.
 *
 * ## What is NOT known here, and must not be guessed
 *
 * The request and response mapping below is **unverified**. Mobile Tailor's API
 * is Enterprise-tier and quote-only, so its reference is behind a commercial
 * agreement we do not have. Field names, the endpoint, the polling model and the
 * measurement identifiers are all assumptions.
 *
 * **Verify every one against their documentation before sending a real request.**
 * A wrong mapping here would not fail loudly — it would silently mis-assign
 * measurements, and a confident wrong chest is worse than an error.
 *
 * ## Gates before this may be used — `docs/07-body-measurement-buy-vs-build.md` §7
 *
 * - **G11** API-tier pricing (published tiers exclude API access)
 * - **G12** data residency — no confirmation means no UK/EU claim in the notice
 * - **G13** signed DPA and sub-processor list
 * - **G14** free-trial evaluation against the gate-G8 calibration photos
 * - **G15** re-read the Article 9 argument against a full 3D avatar
 *
 * ## Two facts that survive whatever the API turns out to look like
 *
 * 1. **Height is still required.** Mobile Tailor takes gender, height and weight
 *    as user input. Buying a scanner does not remove the height question.
 * 2. **A side photo is required.** Front and side are what give depth, and
 *    depth is what makes a circumference a measurement rather than an inference.
 */
class ThreeDLookProvider implements MeasurementProvider {
  readonly name = "3dlook";
  readonly runsOn = "server" as const;
  readonly requiresSideImage = true;

  async measure(input: MeasurementInput): Promise<MeasurementResult> {
    const apiKey = process.env.THREEDLOOK_API_KEY?.trim();
    if (!apiKey) {
      throw new MeasurementConfigError(
        "3DLOOK is selected but THREEDLOOK_API_KEY is not set. " +
          "This provider is also a worked example whose request mapping is unverified — " +
          "see lib/measure/threedlook.ts and docs/07-body-measurement-buy-vs-build.md §7 " +
          "before enabling it.",
      );
    }

    if (!input.sideImage) {
      return {
        ok: false,
        provider: this.name,
        values: {},
        issues: ["missing_side_image"],
        message:
          "A side-on photo is needed as well as a front one. Depth is what turns a width into a circumference.",
        photoLeftDevice: false,
      };
    }

    // Deliberately not implemented. Reaching this point means someone supplied a
    // key without doing the verification above, and a silent best-effort request
    // is the worst available outcome: it would spend money and return numbers
    // nobody has checked the meaning of.
    throw new MeasurementConfigError(
      "3DLOOK request mapping is not implemented. Confirm the endpoint, request " +
        "fields and measurement identifiers against 3DLOOK's own API reference " +
        "(gate G11) and implement them here before use. Do not infer them.",
    );
  }
}

export const threeDLookProvider = new ThreeDLookProvider();

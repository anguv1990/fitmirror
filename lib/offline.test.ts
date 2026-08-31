import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recommendSize } from "./fit/recommend";
import { getSizeChart } from "./fit/sizeCharts";
import { GARMENTS } from "./garments";
import { DEFAULT_MEASUREMENT_PROVIDER, measurementProviderName } from "./measure/config";
import { getProvider } from "./tryon";

/**
 * Gate G9 — the demo must run with the venue's wifi off, and the fit path must
 * never carry a marginal cost.
 *
 * These are cost and resilience invariants, not unit tests of behaviour. The
 * failure they exist to catch is someone changing a default: a paid provider
 * reached by a fresh clone bills real money on the first page load, and a
 * default that reaches the network turns a scripted demo into a bet on venue
 * wifi. Both are silent — everything still works on the developer's machine.
 */

/** Fails the test rather than the request, so the assertion names the host. */
function trapNetwork() {
  const trap = vi.fn((input: unknown) => {
    throw new Error(`Unexpected network call to ${String(input)}`);
  });
  vi.stubGlobal("fetch", trap);
  return trap;
}

describe("offline and zero-cost guarantees (G9)", () => {
  beforeEach(() => {
    delete process.env.TRYON_PROVIDER;
    delete process.env.MEASUREMENT_PROVIDER;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("the network trap is actually armed", () => {
    // Without this, a trap that silently failed to install would make every
    // other assertion in this file vacuous — they would pass by not running.
    const trap = trapNetwork();
    expect(() => fetch("https://example.com")).toThrow(/Unexpected network call/);
    expect(trap).toHaveBeenCalledOnce();
  });

  it("a fresh clone resolves the offline try-on provider", () => {
    // Not a style preference: an unset TRYON_PROVIDER must never resolve to a
    // backend that bills per image.
    expect(getProvider().name).toBe("mock");
  });

  it("a fresh clone resolves the on-device measurement provider", () => {
    // `local` runs in the browser, which is the same statement as "the photo
    // stays on the device". A different default silently changes that claim.
    expect(measurementProviderName()).toBe(DEFAULT_MEASUREMENT_PROVIDER);
    expect(DEFAULT_MEASUREMENT_PROVIDER).toBe("local");
  });

  it("the size recommendation makes no network call", () => {
    const trap = trapNetwork();

    const result = recommendSize({
      measurements: { chestCm: 98 },
      chart: getSizeChart("boden-womens")!,
    });

    expect(result.recommendedSize).toBeTruthy();
    expect(trap).not.toHaveBeenCalled();
  });

  it("the default try-on provider makes no network call", async () => {
    const trap = trapNetwork();

    const result = await getProvider().run(
      {
        personImage: "data:image/png;base64,iVBORw0KGgo=",
        personWidth: 800,
        personHeight: 1200,
        garmentId: GARMENTS[0].id,
      },
      GARMENTS[0],
    );

    expect(result.provider).toBe("mock");
    expect(trap).not.toHaveBeenCalled();
  });

  it("keeps simulated and aiGenerated as separate flags", async () => {
    // The mock composites artwork, so it is not AI-generated. Collapsing these
    // into one flag would make the on-image label a false disclosure.
    const result = await getProvider().run(
      {
        personImage: "data:image/png;base64,iVBORw0KGgo=",
        personWidth: 800,
        personHeight: 1200,
        garmentId: GARMENTS[0].id,
      },
      GARMENTS[0],
    );

    expect(result.simulated).toBe(true);
    expect(result.aiGenerated).toBe(false);
  });
});

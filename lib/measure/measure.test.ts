import { describe, expect, it } from "vitest";
import {
  DEFAULT_MEASUREMENT_PROVIDER,
  getMeasurementProvider,
  measurementProviderNames,
} from "./index";
import {
  measurementNotes,
  toBodyMeasurements,
  type MeasurementResult,
} from "./types";

function result(values: MeasurementResult["values"]): MeasurementResult {
  return {
    ok: true,
    provider: "local",
    values,
    issues: [],
    photoLeftDevice: false,
  };
}

describe("the provider registry", () => {
  it("defaults to the local provider", () => {
    // The default decides whether a fresh clone works offline, with no key and
    // no account, and whether the demo survives venue wifi.
    expect(DEFAULT_MEASUREMENT_PROVIDER).toBe("local");
    expect(getMeasurementProvider().name).toBe("local");
  });

  it("keeps the local provider in the browser", () => {
    // "Runs in the browser" and "the photo stays on the device" are the same
    // statement. If this ever flips, the consent copy is wrong.
    const local = getMeasurementProvider("local");
    expect(local.runsOn).toBe("browser");
  });

  it("treats every non-local provider as transmitting", () => {
    for (const name of measurementProviderNames()) {
      if (name === "local") continue;
      expect(getMeasurementProvider(name).runsOn).toBe("server");
    }
  });

  it("throws on an unknown provider rather than falling back", () => {
    // A silent fallback would mean the UI promising a vendor scan and quietly
    // delivering a coarse local estimate.
    expect(() => getMeasurementProvider("nope")).toThrow(/unknown measurement_provider/i);
  });
});

describe("3dlook", () => {
  const provider = getMeasurementProvider("3dlook");

  it("requires a side photo, because depth is the point of buying one", () => {
    expect(provider.requiresSideImage).toBe(true);
  });

  it("refuses to run without credentials rather than guessing", async () => {
    await expect(
      provider.measure({ heightCm: 175, frontImage: "data:image/jpeg;base64,x" }),
    ).rejects.toThrow(/THREEDLOOK_API_KEY/);
  });
});

describe("toBodyMeasurements", () => {
  it("passes through measured and estimated values", () => {
    const body = toBodyMeasurements(
      result({
        chestCm: { valueCm: 100, confidence: "estimated" },
        waistCm: { valueCm: 85, confidence: "measured" },
      }),
    );
    expect(body).toEqual({ chestCm: 100, waistCm: 85 });
  });

  it("drops unreliable values by default", () => {
    // The live case: the local provider's hip is ~30cm low because the
    // multiplier is applied to joint centres rather than outer hip breadth.
    // A number we have evidence is wrong must not move a size recommendation.
    const body = toBodyMeasurements(
      result({
        chestCm: { valueCm: 100, confidence: "estimated" },
        hipCm: { valueCm: 66.7, confidence: "unreliable", note: "reads far too small" },
      }),
    );
    expect(body).toEqual({ chestCm: 100 });
    expect(body.hipCm).toBeUndefined();
  });

  it("can include unreliable values when a caller asks explicitly", () => {
    const body = toBodyMeasurements(
      result({ hipCm: { valueCm: 66.7, confidence: "unreliable" } }),
      { includeUnreliable: true },
    );
    expect(body.hipCm).toBe(66.7);
  });

  it("ignores measurements the fit engine does not consume", () => {
    const body = toBodyMeasurements(
      result({ inseamCm: { valueCm: 80, confidence: "measured" } }),
    );
    expect(body).toEqual({});
  });
});

describe("measurementNotes", () => {
  it("surfaces every caveat so none is silently dropped", () => {
    const notes = measurementNotes(
      result({
        chestCm: { valueCm: 100, confidence: "estimated", note: "reads narrow" },
        hipCm: { valueCm: 66, confidence: "unreliable", note: "reads far too small" },
      }),
    );
    expect(notes).toEqual(["reads narrow", "reads far too small"]);
  });

  it("returns nothing when there is nothing to caveat", () => {
    expect(measurementNotes(result({ chestCm: { valueCm: 100, confidence: "measured" } })))
      .toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { measurementProviderNames } from "../measure";
import { providerNames } from "../tryon";
import {
  consentStatements,
  getDisclosure,
  getMeasurementDisclosure,
  knownMeasurementProviders,
  knownProviders,
  MEASUREMENT_DISCLOSURE,
  renderLabel,
} from "./disclosure";

describe("disclosure coverage", () => {
  // The guard that gives the rest of this module its value. A provider with no
  // stated handling of the photo must not be reachable, because the consent
  // copy is generated from that statement.
  it("every registered try-on provider has a disclosure", () => {
    for (const name of providerNames()) {
      expect(() => getDisclosure(name)).not.toThrow();
    }
  });

  it("does not carry disclosures for providers that no longer exist", () => {
    for (const name of knownProviders()) {
      expect(providerNames()).toContain(name);
    }
  });

  it("throws rather than guessing for an unknown provider", () => {
    expect(() => getDisclosure("vertex")).toThrow(/no processing disclosure/i);
  });

  // Same guard, other seam. A measurement provider can receive a body photo, so
  // it must not be reachable without a stated handling of it.
  it("every registered measurement provider has a disclosure", () => {
    for (const name of measurementProviderNames()) {
      expect(() => getMeasurementDisclosure(name)).not.toThrow();
    }
  });

  it("does not carry measurement disclosures for providers that no longer exist", () => {
    for (const name of knownMeasurementProviders()) {
      expect(measurementProviderNames()).toContain(name);
    }
  });
});

describe("the measurement path's disclosure", () => {
  it("keeps the local path on the device", () => {
    const local = getMeasurementDisclosure("local");
    expect(local.photoLeavesDevice).toBe(false);
    expect(local.processor).toBeNull();
    expect(MEASUREMENT_DISCLOSURE).toEqual(local);
  });

  it("records a vendor scanner as transmitting, and names it", () => {
    const vendor = getMeasurementDisclosure("3dlook");
    expect(vendor.photoLeavesDevice).toBe(true);
    expect(vendor.processor).toMatch(/3DLOOK/);
  });

  it("claims no region for the vendor while gate G12 is open", () => {
    expect(getMeasurementDisclosure("3dlook").processingRegion).toBeNull();
  });
});

describe("consent covering both paths", () => {
  it("says measuring stays on the device when it does", () => {
    const text = consentStatements(
      getDisclosure("mock"),
      getMeasurementDisclosure("local"),
    ).join(" ");
    expect(text).toMatch(/never goes anywhere/i);
  });

  it("names the measurement processor when that path transmits too", () => {
    // The failure this prevents: swapping the measurement provider to a vendor
    // while the consent copy still says the photo stays on the device.
    const text = consentStatements(
      getDisclosure("mock"),
      getMeasurementDisclosure("3dlook"),
    ).join(" ");
    expect(text).toMatch(/To measure you, it is also sent to 3DLOOK/);
  });

  it("still works with no measurement disclosure supplied", () => {
    expect(consentStatements(getDisclosure("mock")).length).toBeGreaterThan(0);
  });
});

describe("consentStatements", () => {
  it("names the third-party processor when there is one", () => {
    const statements = consentStatements(getDisclosure("replicate"));
    expect(statements.join(" ")).toContain("Replicate");
  });

  it("says plainly that nobody else sees it when there is no processor", () => {
    const statements = consentStatements(getDisclosure("mock"));
    expect(statements).toContain("No third party receives it.");
    expect(statements.join(" ")).not.toMatch(/Replicate/);
  });

  it("never claims UK processing while the region is unestablished", () => {
    // Gate G1 is open. Asserting residency we have not verified is the specific
    // failure this test exists to prevent.
    for (const name of knownProviders()) {
      const disclosure = getDisclosure(name);
      if (disclosure.processingRegion !== null) continue;
      const statements = consentStatements(disclosure);
      expect(statements.join(" ")).toMatch(/has not been confirmed/i);
      // Match the affirmative form only. A naive substring check passes on
      // "we are not claiming it stays in the UK", which means the opposite.
      expect(statements.some((s) => s.startsWith("Processing happens in:"))).toBe(
        false,
      );
    }
  });

  it("tells the shopper consent can be withdrawn", () => {
    expect(consentStatements(getDisclosure("mock")).join(" ")).toMatch(
      /withdraw at any time/i,
    );
  });

  it("states that nothing is retained when nothing is retained", () => {
    expect(consentStatements(getDisclosure("mock")).join(" ")).toMatch(
      /never written to disk/i,
    );
  });
});

describe("the measurement path", () => {
  it("is the one path where the photo does not leave the device", () => {
    expect(MEASUREMENT_DISCLOSURE.photoLeavesDevice).toBe(false);
    expect(MEASUREMENT_DISCLOSURE.processor).toBeNull();
    expect(consentStatements(MEASUREMENT_DISCLOSURE)).toContain(
      "Your photo stays on your device.",
    );
  });
});

describe("renderLabel", () => {
  it("labels a generated image as AI-generated", () => {
    expect(renderLabel({ aiGenerated: true })).toEqual({
      text: "AI-generated image",
      tone: "info",
    });
  });

  it("does not call the mock's overlay AI-generated", () => {
    const label = renderLabel({ simulated: true, aiGenerated: false });
    expect(label?.text).toMatch(/not AI-generated/);
  });

  it("prefers the simulated warning when a provider sets both", () => {
    // Contradictory input. "Placeholder" is the more important of the two
    // claims, and calling it AI-generated would be the more misleading.
    const label = renderLabel({ simulated: true, aiGenerated: true });
    expect(label?.tone).toBe("warn");
    expect(label?.text).toMatch(/placeholder/i);
  });

  it("says nothing when there is nothing to disclose", () => {
    expect(renderLabel({})).toBeNull();
  });
});

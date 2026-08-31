import { describe, expect, it } from "vitest";
import {
  garmentImageUrl,
  GarmentImageError,
  garmentsWithPhotography,
  requireGarmentPhotograph,
} from "./garmentImage";
import { GARMENTS } from "./garments";
import type { Garment, GarmentImage } from "./types";

function garment(image?: GarmentImage): Garment {
  return {
    id: "test-tee",
    name: "Test Tee",
    category: "top",
    accent: "#000",
    art: "<path d='M0 0'/>",
    fit: { x: 0, y: 0, width: 1, height: 1 },
    ...(image ? { image } : {}),
  };
}

const PHOTO: GarmentImage = {
  url: "https://cdn.example.com/tee.jpg",
  kind: "photograph",
  licence: "Own photography",
};

describe("garmentImageUrl", () => {
  it("returns an absolute URL unchanged", () => {
    expect(garmentImageUrl(garment(PHOTO))).toBe("https://cdn.example.com/tee.jpg");
  });

  it("absolutises a site-relative path against the origin", () => {
    const g = garment({ ...PHOTO, url: "/garments/tee.jpg" });
    expect(garmentImageUrl(g, { origin: "https://fitmirror.example" })).toBe(
      "https://fitmirror.example/garments/tee.jpg",
    );
  });

  it("explains itself when the garment has no image at all", () => {
    expect(() => garmentImageUrl(garment())).toThrow(GarmentImageError);
    expect(() => garmentImageUrl(garment())).toThrow(/garment\.art is vector artwork/);
  });

  it("refuses a relative path with no origin rather than guessing localhost", () => {
    // A hosted model cannot fetch localhost. Silently defaulting to it would
    // produce a request that fails somewhere far less legible.
    const g = garment({ ...PHOTO, url: "/garments/tee.jpg" });
    expect(() => garmentImageUrl(g)).toThrow(/PUBLIC_ORIGIN/);
  });
});

describe("requireGarmentPhotograph", () => {
  it("accepts a photograph", () => {
    expect(requireGarmentPhotograph(garment(PHOTO))).toBe(PHOTO.url);
  });

  it("rejects an illustration before any request is made", () => {
    // The failure this exists to prevent: a hosted model given vector artwork
    // does not error, it returns a confident useless render and bills for it.
    const g = garment({ ...PHOTO, kind: "illustration" });
    expect(() => requireGarmentPhotograph(g)).toThrow(/needs a photograph/);
  });

  it("does not infer kind from the file extension", () => {
    // A .png of a flat illustration is still an illustration.
    const g = garment({
      url: "https://cdn.example.com/tee.png",
      kind: "illustration",
      licence: "Own artwork",
    });
    expect(() => requireGarmentPhotograph(g)).toThrow(GarmentImageError);
  });
});

describe("the shipped catalogue", () => {
  it("has no garment photography yet, and every hosted provider must say so", () => {
    // Gate G16. This is a statement of fact, not an aspiration: when real
    // photography lands, this test changes and the render path opens.
    expect(garmentsWithPhotography(GARMENTS)).toEqual([]);
  });

  it("still renders offline, because the mock uses art rather than a photo", () => {
    for (const g of GARMENTS) {
      expect(g.art.trim().length).toBeGreaterThan(0);
    }
  });

  it("records a licence for any image that is added", () => {
    // Retailer product photography is copyrighted. Nothing whose rights are
    // unclear should reach the catalogue.
    for (const g of GARMENTS) {
      if (!g.image) continue;
      expect(g.image.licence.trim().length).toBeGreaterThan(0);
    }
  });
});

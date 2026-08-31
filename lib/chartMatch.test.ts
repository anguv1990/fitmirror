import { describe, expect, it } from "vitest";
import { chartMismatch } from "./chartMatch";
import { SIZE_CHARTS, getSizeChart } from "./fit/sizeCharts";
import { GARMENTS } from "./garments";

const womens = getSizeChart("boden-womens")!;
const mens = getSizeChart("seasalt-mens")!;

const dress = GARMENTS.find((g) => g.category === "dress")!;
const top = GARMENTS.find((g) => g.category === "top")!;

describe("size chart audience", () => {
  it("every chart declares who it sizes", () => {
    // Same standard as `verified`: taken from the retailer's page, not inferred.
    for (const chart of SIZE_CHARTS) {
      expect(["womens", "mens"]).toContain(chart.audience);
    }
  });

  it("records the audience each retailer actually publishes", () => {
    expect(womens.audience).toBe("womens");
    expect(mens.audience).toBe("mens");
  });
});

describe("chartMismatch", () => {
  it("rejects a dress against a menswear chart", () => {
    const reason = chartMismatch(dress, mens);
    expect(reason).toContain(dress.name);
    expect(reason).toContain("men's size chart");
  });

  it("names the audience rather than the dated source string", () => {
    // `chart.source` ends "…, retrieved 2026-08-29", which reads badly
    // mid-sentence and dates the copy for no benefit to the shopper.
    expect(chartMismatch(dress, mens)).not.toContain("retrieved");
  });

  it("allows a dress against a womenswear chart", () => {
    expect(chartMismatch(dress, womens)).toBeNull();
  });

  // The point of the guard is that it is narrow. Both charts carry tops, so a
  // `top` says nothing about which chart applies — staying quiet is correct,
  // and a broader rule would be guessing.
  it("stays quiet about a top on either chart", () => {
    expect(chartMismatch(top, womens)).toBeNull();
    expect(chartMismatch(top, mens)).toBeNull();
  });

  it("stays quiet when either side is missing", () => {
    expect(chartMismatch(null, mens)).toBeNull();
    expect(chartMismatch(dress, null)).toBeNull();
    expect(chartMismatch(null, null)).toBeNull();
  });

  it("does not mangle the category in the message", () => {
    // "dress" + "es" happens to read correctly; the message must not rely on
    // that, because the next category added would not.
    const reason = chartMismatch(dress, mens)!;
    expect(reason).not.toMatch(/dresss|bottomes|tops(?!\b)/);
    expect(reason).toContain("dress sizing");
  });
});

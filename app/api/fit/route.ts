import { NextResponse } from "next/server";
import { recommendSize } from "@/lib/fit/recommend";
import { getSizeChart, SIZE_CHARTS } from "@/lib/fit/sizeCharts";
import type {
  BodyMeasurements,
  FitPreference,
  MeasurementSource,
  SizeChart,
} from "@/lib/fit/types";

/**
 * POST /api/fit — size recommendation.
 *
 * Deliberately makes no network calls and costs nothing to run: the fit path
 * must keep working when the paid render path is rate-limited, offline, or
 * turned off entirely (docs/02-architecture.md §1).
 *
 * Accepts declared measurements only. The photo path lands here too, but pose
 * estimation runs client-side so the image itself never reaches the server —
 * the client sends derived numbers with measurementSource=estimated_from_photo.
 */

const FIT_PREFERENCES: FitPreference[] = ["fitted", "regular", "relaxed"];
const SOURCES: MeasurementSource[] = ["declared", "estimated_from_photo"];

// Human bodies outside this range indicate a unit error (inches for cm) rather
// than a real measurement.
const PLAUSIBLE_CM = { min: 30, max: 250 };

export async function GET() {
  // Lets the client populate a chart picker without hardcoding ids.
  return NextResponse.json({
    charts: SIZE_CHARTS.map(({ id, source, verified, entries }) => ({
      id,
      source,
      verified,
      sizes: entries.map((e) => e.size),
    })),
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const parsed = parseRequest(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const chart = getSizeChart(parsed.value.sizeChartId);
  if (!chart) {
    return NextResponse.json(
      {
        error: `No size chart with id "${parsed.value.sizeChartId}".`,
        available: SIZE_CHARTS.map((c) => c.id),
      },
      { status: 400 },
    );
  }

  // Catch inches typed into a centimetre field. Without this the request is
  // technically valid and silently yields the smallest size — the exact
  // size-mistake this service exists to prevent.
  const unitError = detectInchInput(parsed.value.measurements, chart);
  if (unitError) {
    return NextResponse.json({ error: unitError }, { status: 400 });
  }

  const recommendation = recommendSize({
    measurements: parsed.value.measurements,
    chart,
    fitPreference: parsed.value.fitPreference,
    measurementSource: parsed.value.measurementSource,
  });

  return NextResponse.json(recommendation);
}

const CM_PER_INCH = 2.54;

/**
 * Returns an error message when every supplied measurement falls below the
 * chart's range but lands inside it once converted from inches. UK/US unit
 * mixing is a real source of retail sizing errors, and a confident-looking
 * recommendation built on inches is worse than a rejection.
 */
function detectInchInput(
  measurements: BodyMeasurements,
  chart: SizeChart,
): string | null {
  const keys = Object.keys(measurements) as (keyof BodyMeasurements)[];
  if (keys.length === 0) return null;

  const suspicious = keys.every((key) => {
    const value = measurements[key]!;
    const bounds = chartBounds(chart, key);
    if (!bounds) return false;
    return value < bounds.min && value * CM_PER_INCH >= bounds.min &&
      value * CM_PER_INCH <= bounds.max;
  });

  if (!suspicious) return null;

  const converted = keys
    .map((key) => `${key} ${Math.round(measurements[key]! * CM_PER_INCH)}cm`)
    .join(", ");
  return `Measurements must be in centimetres. These look like inches — did you mean ${converted}?`;
}

function chartBounds(
  chart: SizeChart,
  key: keyof BodyMeasurements,
): { min: number; max: number } | null {
  const ranges = chart.entries
    .map((entry) => entry[key])
    .filter((range): range is [number, number] => range !== undefined);
  if (ranges.length === 0) return null;
  return {
    min: Math.min(...ranges.map((r) => r[0])),
    max: Math.max(...ranges.map((r) => r[1])),
  };
}

type Parsed =
  | {
      value: {
        measurements: BodyMeasurements;
        sizeChartId: string;
        fitPreference?: FitPreference;
        measurementSource?: MeasurementSource;
      };
    }
  | { error: string };

function parseRequest(body: unknown): Parsed {
  if (typeof body !== "object" || body === null) {
    return { error: "Expected a JSON object." };
  }

  const { measurements, sizeChartId, fitPreference, measurementSource } =
    body as Record<string, unknown>;

  if (typeof sizeChartId !== "string" || sizeChartId.length === 0) {
    return { error: "sizeChartId is required." };
  }

  if (typeof measurements !== "object" || measurements === null) {
    return { error: "measurements must be an object of centimetre values." };
  }

  const parsedMeasurements: BodyMeasurements = {};
  const keys: (keyof BodyMeasurements)[] = ["chestCm", "waistCm", "hipCm"];
  const source = measurements as Record<string, unknown>;

  for (const key of keys) {
    const value = source[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return { error: `${key} must be a number in centimetres.` };
    }
    if (value < PLAUSIBLE_CM.min || value > PLAUSIBLE_CM.max) {
      return {
        error: `${key} of ${value}cm is out of plausible range (${PLAUSIBLE_CM.min}-${PLAUSIBLE_CM.max}cm). Measurements must be in centimetres.`,
      };
    }
    parsedMeasurements[key] = value;
  }

  if (Object.keys(parsedMeasurements).length === 0) {
    return { error: "Provide at least one of chestCm, waistCm or hipCm." };
  }

  if (fitPreference !== undefined && !FIT_PREFERENCES.includes(fitPreference as FitPreference)) {
    return { error: `fitPreference must be one of: ${FIT_PREFERENCES.join(", ")}.` };
  }

  if (
    measurementSource !== undefined &&
    !SOURCES.includes(measurementSource as MeasurementSource)
  ) {
    return { error: `measurementSource must be one of: ${SOURCES.join(", ")}.` };
  }

  return {
    value: {
      measurements: parsedMeasurements,
      sizeChartId,
      fitPreference: fitPreference as FitPreference | undefined,
      measurementSource: measurementSource as MeasurementSource | undefined,
    },
  };
}

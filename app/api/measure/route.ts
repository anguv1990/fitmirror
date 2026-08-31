import { NextResponse } from "next/server";
import {
  getMeasurementProvider,
  measurementProviderName,
  MeasurementConfigError,
} from "@/lib/measure";
import type { MeasurementInput } from "@/lib/measure/types";

/**
 * Server-side measurement, for providers that transmit the photo.
 *
 * The local provider never reaches here — it runs in the browser, which is the
 * whole point of it. This route exists for vendor providers whose credentials
 * must stay server-side.
 *
 * **Nothing is stored and nothing is logged.** Error paths deliberately log the
 * provider and the failure only; an image or a measurement in a log file is a
 * retention decision nobody made (`docs/03-compliance-uk.md` §8).
 */

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const parsed = parseInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const name = measurementProviderName();

  // A local-provider request arriving here means the client routed wrongly. Fail
  // rather than quietly running it server-side, which would transmit a photo the
  // shopper was told stays on their device.
  if (name === "local") {
    return NextResponse.json(
      {
        error:
          "The local provider runs in the browser. Reaching this route means the photo was transmitted when it should not have been.",
      },
      { status: 400 },
    );
  }

  try {
    const provider = getMeasurementProvider(name);
    const result = await provider.measure(parsed.value);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MeasurementConfigError) {
      console.error("[measure] provider not configured:", error.message);
      return NextResponse.json({ error: error.message }, { status: 501 });
    }
    const message = error instanceof Error ? error.message : "Unknown provider error.";
    console.error(`[measure] provider "${name}" failed:`, message);
    return NextResponse.json({ error: `Measurement failed: ${message}` }, { status: 502 });
  }
}

type Parsed = { value: MeasurementInput } | { error: string };

function parseInput(body: unknown): Parsed {
  if (typeof body !== "object" || body === null) {
    return { error: "Expected a JSON object." };
  }

  const { heightCm, frontImage, sideImage, weightKg, reportedGender } = body as Record<
    string,
    unknown
  >;

  // Height is checked first and hard: without it there is no scale, and every
  // returned number would be wrong by whatever factor the guess was off by.
  if (typeof heightCm !== "number" || !Number.isFinite(heightCm)) {
    return { error: "heightCm is required — a photo has no scale of its own." };
  }
  if (heightCm < 100 || heightCm > 250) {
    return { error: "heightCm must be between 100 and 250." };
  }

  if (typeof frontImage !== "string" || !frontImage.startsWith("data:image/")) {
    return { error: "frontImage must be a data:image/... URL." };
  }
  if (frontImage.length > MAX_IMAGE_BYTES) {
    return { error: "frontImage is too large (8MB max)." };
  }

  if (sideImage !== undefined) {
    if (typeof sideImage !== "string" || !sideImage.startsWith("data:image/")) {
      return { error: "sideImage must be a data:image/... URL when supplied." };
    }
    if (sideImage.length > MAX_IMAGE_BYTES) {
      return { error: "sideImage is too large (8MB max)." };
    }
  }

  if (weightKg !== undefined && (typeof weightKg !== "number" || weightKg <= 0)) {
    return { error: "weightKg must be a positive number when supplied." };
  }

  if (
    reportedGender !== undefined &&
    !["female", "male", "unspecified"].includes(reportedGender as string)
  ) {
    return { error: "reportedGender must be female, male or unspecified." };
  }

  return {
    value: {
      heightCm,
      frontImage,
      ...(sideImage ? { sideImage: sideImage as string } : {}),
      ...(weightKg ? { weightKg: weightKg as number } : {}),
      ...(reportedGender
        ? { reportedGender: reportedGender as MeasurementInput["reportedGender"] }
        : {}),
    },
  };
}

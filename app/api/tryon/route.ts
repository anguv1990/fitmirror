import { NextResponse } from "next/server";
import { getGarment } from "@/lib/garments";
import { getProvider, ProviderConfigError } from "@/lib/tryon";
import type { TryOnRequest } from "@/lib/types";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

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

  const garment = getGarment(parsed.value.garmentId);
  if (!garment) {
    return NextResponse.json(
      { error: `No garment with id "${parsed.value.garmentId}".` },
      { status: 400 },
    );
  }

  try {
    const result = await getProvider().run(parsed.value, garment);
    return NextResponse.json(result);
  } catch (error) {
    // Misconfiguration is the operator's problem, not a transient upstream
    // failure — surface it distinctly so it is actionable in the UI.
    if (error instanceof ProviderConfigError) {
      console.error("[tryon] provider not configured:", error.message);
      return NextResponse.json({ error: error.message }, { status: 501 });
    }
    const message = error instanceof Error ? error.message : "Unknown provider error.";
    console.error("[tryon] provider failed:", message);
    return NextResponse.json({ error: `Try-on failed: ${message}` }, { status: 502 });
  }
}

type Parsed = { value: TryOnRequest } | { error: string };

function parseRequest(body: unknown): Parsed {
  if (typeof body !== "object" || body === null) {
    return { error: "Expected a JSON object." };
  }

  const { personImage, personWidth, personHeight, garmentId } = body as Record<
    string,
    unknown
  >;

  if (typeof personImage !== "string" || !personImage.startsWith("data:image/")) {
    return { error: "personImage must be a data:image/... URL." };
  }
  if (personImage.length > MAX_IMAGE_BYTES) {
    return { error: "personImage is too large (8MB max)." };
  }
  if (typeof garmentId !== "string" || garmentId.length === 0) {
    return { error: "garmentId is required." };
  }
  if (!isPositiveInt(personWidth) || !isPositiveInt(personHeight)) {
    return { error: "personWidth and personHeight must be positive numbers." };
  }

  return {
    value: {
      personImage,
      personWidth: Math.round(personWidth),
      personHeight: Math.round(personHeight),
      garmentId,
    },
  };
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

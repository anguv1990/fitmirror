import { estimateMeasurements, type MeasurementEstimate } from "./measure";
import type { PoseLandmark } from "./landmarks";

/**
 * Browser-side pose estimation against an already-loaded image.
 *
 * Separated from any component so the same photo can serve two purposes without
 * being uploaded twice: measurement (here, client-side, never transmitted) and
 * try-on rendering (server-side, only on explicit action).
 *
 * The landmarker is expensive to construct, so it is created once and reused.
 */

interface Landmarker {
  detect: (image: HTMLImageElement) => { landmarks?: PoseLandmark[][] };
  close?: () => void;
}

const WASM_PATH = "/mediapipe/wasm";
const MODEL_PATH = "/mediapipe/pose_landmarker_lite.task";

let landmarkerPromise: Promise<Landmarker> | null = null;

async function getLandmarker(): Promise<Landmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      // Dynamic import: the bundle is large and only needed on this path.
      const { FilesetResolver, PoseLandmarker } = await import(
        "@mediapipe/tasks-vision"
      );
      const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
      const landmarker = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_PATH, delegate: "GPU" },
        runningMode: "IMAGE",
        numPoses: 1,
      });
      return landmarker as unknown as Landmarker;
    })().catch((cause) => {
      // Do not cache a failed init: a missing model should be retryable after
      // the operator runs `npm run setup:pose`.
      landmarkerPromise = null;
      throw cause;
    });
  }
  return landmarkerPromise;
}

export class PoseAssetsMissingError extends Error {
  constructor() {
    super(
      "Pose model could not be loaded. Run `npm run setup:pose` to vendor the MediaPipe assets.",
    );
    this.name = "PoseAssetsMissingError";
  }
}

/** Estimate measurements from an image source (data URL or object URL). */
export async function estimateFromImageSource(
  src: string,
  heightCm: number,
): Promise<MeasurementEstimate> {
  let landmarker: Landmarker;
  try {
    landmarker = await getLandmarker();
  } catch {
    throw new PoseAssetsMissingError();
  }

  const image = await loadImage(src);
  const result = landmarker.detect(image);
  const landmarks = result.landmarks?.[0];

  if (!landmarks || landmarks.length === 0) {
    return {
      ok: false,
      measurements: {},
      issues: ["no_full_body"],
      message:
        "No person detected. Use a full-length photo, facing the camera, against a plain background.",
    };
  }

  return estimateMeasurements({
    landmarks,
    heightCm,
    imageWidth: image.naturalWidth,
    imageHeight: image.naturalHeight,
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image failed to load"));
    image.src = src;
  });
}

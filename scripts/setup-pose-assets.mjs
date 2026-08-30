#!/usr/bin/env node
/**
 * Vendors the MediaPipe pose assets into public/mediapipe/.
 *
 * Why not just load these from the CDN: gate G9 requires the demo to run with
 * wifi disabled (docs/04-prerequisite-gate.md). Serving the WASM runtime and the
 * model locally means pose estimation keeps working offline.
 *
 * Why these files are gitignored rather than committed: the model is ~5.8MB and
 * the WASM runtime is several MB more. Binaries of that size do not belong in
 * git history. Run this once after `npm install`.
 *
 * Usage: npm run setup:pose
 */
import { createWriteStream } from "node:fs";
import { cp, mkdir, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DEST = path.join(ROOT, "public", "mediapipe");
const WASM_SRC = path.join(ROOT, "node_modules", "@mediapipe", "tasks-vision", "wasm");

// Pinned to a specific model version so results are reproducible across setups.
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const MODEL_DEST = path.join(DEST, "pose_landmarker_lite.task");

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(DEST, { recursive: true });

  if (!(await exists(WASM_SRC))) {
    console.error(
      "✗ @mediapipe/tasks-vision is not installed. Run `npm install` first.",
    );
    process.exit(1);
  }

  await cp(WASM_SRC, path.join(DEST, "wasm"), { recursive: true });
  console.log("✓ WASM runtime copied to public/mediapipe/wasm");

  if (await exists(MODEL_DEST)) {
    console.log("✓ Pose model already present, skipping download");
  } else {
    console.log(`… Downloading pose model (~5.8MB)`);
    const response = await fetch(MODEL_URL);
    if (!response.ok) {
      console.error(`✗ Model download failed: HTTP ${response.status}`);
      process.exit(1);
    }
    await pipeline(Readable.fromWeb(response.body), createWriteStream(MODEL_DEST));
    const { size } = await stat(MODEL_DEST);
    console.log(`✓ Pose model saved (${(size / 1e6).toFixed(1)}MB)`);
  }

  console.log("\nPose assets ready. The demo will now run offline.");
}

main().catch((error) => {
  console.error("✗ Setup failed:", error.message);
  process.exit(1);
});

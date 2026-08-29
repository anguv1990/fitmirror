"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { estimateMeasurements, type MeasurementEstimate } from "@/lib/pose/measure";
import type { PoseLandmark } from "@/lib/pose/landmarks";

/**
 * Estimates body measurements from a photo, entirely in the browser.
 *
 * ## Privacy: the photo never leaves the device
 *
 * Pose detection runs client-side against a locally served model. Only the
 * derived numbers (chest/hip in cm) are ever sent to the server, and only when
 * the shopper submits them. This is the strongest privacy control in the
 * product and it is architectural, not procedural — there is no upload to
 * forget to delete (docs/02-architecture.md §7, docs/03-compliance-uk.md §7).
 *
 * ## Compliance: pose only
 *
 * Uses PoseLandmarker (body landmarks). It must never use face embedding or
 * recognition, which would make this biometric data under UK GDPR
 * (docs/03-compliance-uk.md §1).
 */

interface Props {
  heightCm: number | null;
  onEstimate: (estimate: MeasurementEstimate) => void;
}

type Status = "idle" | "loading-model" | "ready" | "detecting" | "error";

// Vendored by `npm run setup:pose` so the demo works offline.
const WASM_PATH = "/mediapipe/wasm";
const MODEL_PATH = "/mediapipe/pose_landmarker_lite.task";

export default function PhotoMeasure({ heightCm, onEstimate }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Loaded lazily and kept across detections — model init is the slow part.
  const landmarkerRef = useRef<{
    detect: (image: HTMLImageElement) => { landmarks?: PoseLandmark[][] };
    close?: () => void;
  } | null>(null);

  useEffect(() => {
    return () => {
      landmarkerRef.current?.close?.();
      landmarkerRef.current = null;
    };
  }, []);

  const ensureLandmarker = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current;

    setStatus("loading-model");
    // Imported dynamically: the bundle is large and only needed on this path.
    const { FilesetResolver, PoseLandmarker } = await import(
      "@mediapipe/tasks-vision"
    );
    const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
    const landmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_PATH, delegate: "GPU" },
      runningMode: "IMAGE",
      numPoses: 1,
    });
    landmarkerRef.current = landmarker as unknown as typeof landmarkerRef.current;
    return landmarkerRef.current;
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;

      if (!heightCm) {
        setError(
          "Enter your height first. A photo has no scale of its own, so height is what turns it into centimetres.",
        );
        setStatus("error");
        return;
      }

      setError(null);
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      try {
        const landmarker = await ensureLandmarker();
        setStatus("detecting");

        const image = await loadImage(objectUrl);
        const result = landmarker!.detect(image);
        const landmarks = result.landmarks?.[0];

        if (!landmarks || landmarks.length === 0) {
          setError(
            "No person detected. Use a full-length photo, facing the camera, against a plain background.",
          );
          setStatus("error");
          return;
        }

        const estimate = estimateMeasurements({
          landmarks,
          heightCm,
          imageWidth: image.naturalWidth,
          imageHeight: image.naturalHeight,
        });

        if (!estimate.ok) {
          setError(estimate.message ?? "Could not estimate measurements from this photo.");
          setStatus("error");
          return;
        }

        setStatus("ready");
        onEstimate(estimate);
      } catch (cause) {
        console.error("[pose] detection failed", cause);
        setError(
          "Pose detection could not start. Run `npm run setup:pose` if the model assets are missing.",
        );
        setStatus("error");
      }
    },
    [ensureLandmarker, heightCm, onEstimate],
  );

  // Revoke the object URL when it is replaced or the component unmounts.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <div className="space-y-2.5">
      <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-1.5 border-2 border-dashed border-graphite/25 px-6 text-center transition hover:border-graphite/50">
        <span className="font-display text-base tracking-wide text-graphite uppercase">
          {status === "detecting" || status === "loading-model"
            ? "Reading your photo…"
            : "Estimate from a photo"}
        </span>
        <span className="font-mono text-[11px] tracking-wide text-graphite/50 uppercase">
          Processed on your device — never uploaded
        </span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={status === "detecting" || status === "loading-model"}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </label>

      {error && (
        <p className="border border-redline/40 bg-redline/5 px-3 py-2 text-sm text-graphite">
          {error}
        </p>
      )}
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image failed to load"));
    image.src = src;
  });
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { estimateFromImageSource } from "@/lib/pose/estimator";
import type { MeasurementEstimate } from "@/lib/pose/measure";

/**
 * Standalone photo → measurement widget, used by the /dev/pose harness.
 *
 * The main shopper flow does not use this: there, the photo captured in step A
 * is reused for measurement via `estimateFromImageSource`, so a shopper is never
 * asked for the same photo twice.
 *
 * Detection runs in the browser. The image never leaves the device
 * (docs/03-compliance-uk.md §7).
 */

interface Props {
  heightCm: number | null;
  onEstimate: (estimate: MeasurementEstimate) => void;
}

type Status = "idle" | "working" | "ready" | "error";

export default function PhotoMeasure({ heightCm, onEstimate }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

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
      setStatus("working");
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      try {
        const estimate = await estimateFromImageSource(objectUrl, heightCm);
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
          cause instanceof Error ? cause.message : "Pose detection is unavailable.",
        );
        setStatus("error");
      }
    },
    [heightCm, onEstimate],
  );

  return (
    <div className="space-y-2.5">
      <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-1.5 border-2 border-dashed border-graphite/25 px-6 text-center transition hover:border-graphite/50">
        <span className="font-display text-base tracking-wide text-graphite uppercase">
          {status === "working" ? "Reading your photo…" : "Estimate from a photo"}
        </span>
        <span className="font-mono text-[11px] tracking-wide text-graphite/50 uppercase">
          Processed on your device — never uploaded
        </span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={status === "working"}
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

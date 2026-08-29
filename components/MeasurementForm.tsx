"use client";

import { useState } from "react";
import { estimateFromImageSource } from "@/lib/pose/estimator";
import { SIZE_CHARTS } from "@/lib/fit/sizeCharts";
import type { BodyMeasurements, FitPreference, MeasurementSource } from "@/lib/fit/types";

interface Props {
  heightCm: number | null;
  measurements: BodyMeasurements;
  fitPreference: FitPreference;
  sizeChartId: string;
  /** Photo already captured in step A, reused here without re-uploading. */
  photoDataUrl: string | null;
  onHeightChange: (heightCm: number | null) => void;
  onMeasurementsChange: (
    measurements: BodyMeasurements,
    source: MeasurementSource,
  ) => void;
  onFitPreferenceChange: (preference: FitPreference) => void;
  onSizeChartChange: (id: string) => void;
}

const FIELDS: { key: keyof BodyMeasurements; label: string }[] = [
  { key: "chestCm", label: "Chest" },
  { key: "waistCm", label: "Waist" },
  { key: "hipCm", label: "Hip" },
];

const PREFERENCES: FitPreference[] = ["fitted", "regular", "relaxed"];

export default function MeasurementForm({
  heightCm,
  measurements,
  fitPreference,
  sizeChartId,
  photoDataUrl,
  onHeightChange,
  onMeasurementsChange,
  onFitPreferenceChange,
  onSizeChartChange,
}: Props) {
  const [estimating, setEstimating] = useState(false);
  const [estimateNote, setEstimateNote] = useState<string | null>(null);

  async function estimateFromPhoto() {
    if (!photoDataUrl || !heightCm) return;
    setEstimating(true);
    setEstimateNote(null);
    try {
      const estimate = await estimateFromImageSource(photoDataUrl, heightCm);
      if (!estimate.ok) {
        setEstimateNote(estimate.message ?? "Could not estimate from this photo.");
        return;
      }
      // Merge rather than replace: a waist the shopper typed is better data than
      // anything we could infer, and we never estimate waist anyway.
      onMeasurementsChange(
        { ...measurements, ...estimate.measurements },
        "estimated_from_photo",
      );
      setEstimateNote("Estimated from your photo. Adjust anything that looks off.");
    } catch (cause) {
      setEstimateNote(
        cause instanceof Error ? cause.message : "Pose estimation is unavailable.",
      );
    } finally {
      setEstimating(false);
    }
  }

  const canEstimate = !!photoDataUrl && !!heightCm && !estimating;

  const chart = SIZE_CHARTS.find((c) => c.id === sizeChartId);

  return (
    <div className="space-y-3.5">
      <label className="block">
        <span className="font-mono text-[10px] tracking-widest text-graphite/55 uppercase">
          Size chart
        </span>
        <select
          value={sizeChartId}
          onChange={(e) => onSizeChartChange(e.target.value)}
          className="mt-0.5 w-full border border-graphite/25 bg-transparent px-2 py-1.5 font-sans text-sm text-graphite outline-none focus:border-graphite"
        >
          {SIZE_CHARTS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.source}
            </option>
          ))}
        </select>
        {chart && (
          <span
            className={`mt-1 block font-mono text-[10px] tracking-wide uppercase ${
              chart.verified ? "text-graphite/55" : "text-redline"
            }`}
          >
            {chart.verified
              ? "Real published body measurements"
              : "Placeholder — not a real brand's measurements"}
          </span>
        )}
      </label>

      <div className="grid grid-cols-2 gap-2.5">
        <Field
          label="Height"
          required
          value={heightCm}
          onChange={(v) => onHeightChange(v)}
        />
        {FIELDS.map(({ key, label }) => (
          <Field
            key={key}
            label={label}
            value={measurements[key] ?? null}
            onChange={(v) =>
              onMeasurementsChange(
                { ...measurements, [key]: v ?? undefined },
                "declared",
              )
            }
          />
        ))}
      </div>

      <button
        onClick={estimateFromPhoto}
        disabled={!canEstimate}
        className="w-full border border-graphite/30 py-2 font-mono text-[11px] tracking-widest text-graphite uppercase transition hover:border-graphite disabled:opacity-35"
      >
        {estimating ? "Reading photo…" : "Estimate from my photo"}
      </button>

      {!photoDataUrl && (
        <p className="font-mono text-[10px] tracking-wide text-graphite/50 uppercase">
          Add a photo in step A to estimate automatically
        </p>
      )}
      {photoDataUrl && !heightCm && (
        <p className="font-mono text-[10px] tracking-wide text-graphite/50 uppercase">
          Height is needed — a photo has no scale of its own
        </p>
      )}
      {estimateNote && <p className="text-xs text-graphite/80">{estimateNote}</p>}

      <div>
        <span className="font-mono text-[10px] tracking-widest text-graphite/50 uppercase">
          How should it sit?
        </span>
        <div className="mt-1.5 flex gap-1">
          {PREFERENCES.map((preference) => (
            <button
              key={preference}
              onClick={() => onFitPreferenceChange(preference)}
              aria-pressed={fitPreference === preference}
              className={`flex-1 border py-1.5 font-mono text-[10px] tracking-widest uppercase transition ${
                fitPreference === preference
                  ? "border-graphite bg-graphite text-tissue"
                  : "border-graphite/25 text-graphite/60 hover:border-graphite/60"
              }`}
            >
              {preference}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  required,
  onChange,
}: {
  label: string;
  value: number | null;
  required?: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] tracking-widest text-graphite/55 uppercase">
        {label} {required ? "*" : ""}
        <span className="text-graphite/35"> cm</span>
      </span>
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? null : Number(raw));
        }}
        className="mt-0.5 w-full border border-graphite/25 bg-transparent px-2 py-1.5 font-sans text-base text-graphite outline-none focus:border-graphite"
      />
    </label>
  );
}

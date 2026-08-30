"use client";

import { useCallback, useMemo, useState } from "react";
import {
  analyse,
  CALIBRATED_KEYS,
  caveatLine,
  suggestedMultiplier,
  type CalibrationSample,
} from "@/lib/pose/calibration";
import { estimateFromImageSource } from "@/lib/pose/estimator";
import type { BodyMeasurements } from "@/lib/fit/types";

/**
 * Calibration harness for gate G8 — dev only, never part of the shopper surface.
 *
 * Everything runs in the browser. Photos are held as object URLs and are never
 * uploaded, never written to disk by this page, and never leave the machine.
 * The export button emits **numbers only**: the point is to keep the findings
 * after deleting the photos, so nothing identifiable needs to be retained.
 *
 * The constants under test live in `lib/pose/measure.ts`.
 */

/** Kept in step with lib/pose/measure.ts. Displayed, never imported from there,
 *  because those constants are module-private by design. */
const CURRENT_MULTIPLIERS = {
  chestCm: { name: "SHOULDER_TO_CHEST_CIRCUMFERENCE", value: 2.45 },
  hipCm: { name: "HIP_WIDTH_TO_CIRCUMFERENCE", value: 3.1 },
} as const;

interface Row {
  id: string;
  fileName: string;
  objectUrl: string;
  subject: string;
  label: string;
  heightCm: number | null;
  actualChest: number | null;
  actualHip: number | null;
  estimated: BodyMeasurements | null;
  status: "pending" | "running" | "done" | "failed";
  message?: string;
}

export default function CalibratePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [defaultHeight, setDefaultHeight] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  /**
   * Stamped when a run finishes, never during render. Calling `new Date()` in
   * the render body made the server and client markup differ, and the resulting
   * hydration failure made React rebuild the tree — which silently discarded
   * the uploaded rows. It looked like the file input was broken.
   */
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  const addFiles = useCallback(
    (files: FileList) => {
      const next: Row[] = Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .map((file) => ({
          id: `${file.name}-${crypto.randomUUID()}`,
          fileName: file.name,
          objectUrl: URL.createObjectURL(file),
          // A sensible guess: photos of one person usually share a name prefix.
          subject: file.name.split(/[-_.]/)[0] || "subject",
          label: file.name.replace(/\.[^.]+$/, ""),
          heightCm: defaultHeight,
          actualChest: null,
          actualHip: null,
          estimated: null,
          status: "pending",
        }));
      setRows((prev) => [...prev, ...next]);
    },
    [defaultHeight],
  );

  function update(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  const runAll = useCallback(async () => {
    setBusy(true);
    for (const row of rows) {
      if (!row.heightCm) {
        update(row.id, { status: "failed", message: "Height is required to set the scale." });
        continue;
      }
      update(row.id, { status: "running", message: undefined });
      try {
        const estimate = await estimateFromImageSource(row.objectUrl, row.heightCm);
        update(row.id, {
          estimated: estimate.ok ? estimate.measurements : null,
          status: estimate.ok ? "done" : "failed",
          message: estimate.ok
            ? estimate.issues.length
              ? `Estimated, with issues: ${estimate.issues.join(", ")}`
              : undefined
            : (estimate.message ?? "Could not estimate."),
        });
      } catch (cause) {
        update(row.id, {
          status: "failed",
          message: cause instanceof Error ? cause.message : "Pose estimation failed.",
        });
      }
    }
    setLastRunAt(new Date().toISOString());
    setBusy(false);
  }, [rows]);

  const samples: CalibrationSample[] = useMemo(
    () =>
      rows
        .filter((r) => r.estimated)
        .map((r) => ({
          subject: r.subject.trim().toLowerCase() || "unknown",
          label: r.label,
          actual: {
            ...(r.actualChest ? { chestCm: r.actualChest } : {}),
            ...(r.actualHip ? { hipCm: r.actualHip } : {}),
          },
          estimated: r.estimated!,
        })),
    [rows],
  );

  const stats = useMemo(
    () => CALIBRATED_KEYS.map((key) => analyse(samples, key)),
    [samples],
  );

  /** Numbers only — deliberately no file names, no image data. */
  const exportPayload = useMemo(
    () =>
      JSON.stringify(
        {
          generatedAt: lastRunAt,
          note: "Gate G8 calibration. Numbers only; no images or file names.",
          currentMultipliers: CURRENT_MULTIPLIERS,
          stats: stats.map((s) => ({
            ...s,
            suggested: suggestedMultiplier(CURRENT_MULTIPLIERS[s.key].value, s),
            caveat: caveatLine(s),
          })),
        },
        null,
        2,
      ),
    [stats, lastRunAt],
  );

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <header>
        <h1 className="font-display text-3xl uppercase">Pose calibration · G8</h1>
        <p className="mt-1 max-w-2xl text-sm text-mat-ink">
          Dev only. Everything runs in this browser — photos are never uploaded and
          never leave the machine. Add full-length photos, enter the tape
          measurements, and this reports how wrong the estimate is and whether the
          sample justifies changing a constant.
        </p>
      </header>

      <section className="bg-tissue p-4 text-graphite">
        <div className="flex flex-wrap items-end gap-4">
          <label className="font-mono text-[11px] tracking-widest uppercase">
            Default height (cm)
            <input
              type="number"
              value={defaultHeight ?? ""}
              onChange={(e) =>
                setDefaultHeight(e.target.value === "" ? null : Number(e.target.value))
              }
              className="mt-1 block w-32 border border-graphite/30 bg-transparent px-2 py-1 font-sans text-base"
            />
          </label>

          <label className="cursor-pointer border border-graphite px-4 py-2 font-mono text-[11px] tracking-widest uppercase hover:bg-graphite hover:text-tissue">
            Add photos
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </label>

          <button
            onClick={runAll}
            disabled={busy || rows.length === 0}
            className="bg-graphite px-4 py-2 font-mono text-[11px] tracking-widest text-tissue uppercase disabled:opacity-35"
          >
            {busy ? "Estimating…" : `Run all (${rows.length})`}
          </button>
        </div>

        <p className="mt-3 font-mono text-[10px] tracking-wide text-graphite/60 uppercase">
          Subject = the person. Distinct people are what count, not distinct photos.
        </p>
      </section>

      {rows.length > 0 && (
        <section className="overflow-x-auto bg-tissue p-4 text-graphite">
          <table className="w-full min-w-[54rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-graphite/30 text-left font-mono text-[10px] tracking-widest uppercase">
                <th className="py-2 pr-3">Photo</th>
                <th className="py-2 pr-3">Subject</th>
                <th className="py-2 pr-3">Height</th>
                <th className="py-2 pr-3">Chest: tape</th>
                <th className="py-2 pr-3">est.</th>
                <th className="py-2 pr-3">Hip: tape</th>
                <th className="py-2 pr-3">est.</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-graphite/10 align-top">
                  <td className="py-2 pr-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={row.objectUrl}
                      alt=""
                      className="h-14 w-10 border border-graphite/20 object-cover"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      value={row.subject}
                      onChange={(e) => update(row.id, { subject: e.target.value })}
                      className="w-24 border border-graphite/25 bg-transparent px-1.5 py-1"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <Num
                      value={row.heightCm}
                      onChange={(v) => update(row.id, { heightCm: v })}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <Num
                      value={row.actualChest}
                      onChange={(v) => update(row.id, { actualChest: v })}
                    />
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {row.estimated?.chestCm ?? "—"}
                  </td>
                  <td className="py-2 pr-3">
                    <Num
                      value={row.actualHip}
                      onChange={(v) => update(row.id, { actualHip: v })}
                    />
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {row.estimated?.hipCm ?? "—"}
                  </td>
                  <td className="py-2 font-mono text-[10px] uppercase">
                    <span
                      className={
                        row.status === "failed" ? "text-redline" : "text-graphite/70"
                      }
                    >
                      {row.status}
                    </span>
                    {row.message && (
                      <span className="mt-1 block max-w-[14rem] normal-case text-graphite/60">
                        {row.message}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="space-y-3">
        {stats.map((s) => {
          const current = CURRENT_MULTIPLIERS[s.key];
          const suggested = suggestedMultiplier(current.value, s);
          return (
            <div key={s.key} className="border border-chalk/25 bg-mat-2/50 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-lg tracking-[0.14em] uppercase">
                  {s.key === "chestCm" ? "Chest" : "Hip"}
                </h2>
                <span
                  className={`font-mono text-[10px] tracking-widest uppercase ${
                    s.recommendation === "adjust-multiplier"
                      ? "text-chalk"
                      : "text-mat-ink"
                  }`}
                >
                  {s.recommendation.replace(/-/g, " ")}
                </span>
              </div>

              <p className="mt-2 text-sm leading-relaxed text-mat-ink">{s.rationale}</p>

              {s.n > 0 && (
                <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-xs text-tissue sm:grid-cols-4">
                  <Stat label="photos / people" value={`${s.n} / ${s.subjects}`} />
                  <Stat label="mean error" value={`${s.meanErrorCm}cm`} />
                  <Stat label="mean |error|" value={`${s.meanAbsErrorCm}cm`} />
                  <Stat label="worst" value={`${s.worstErrorCm}cm`} />
                  <Stat label="sd" value={`${s.sdCm}cm`} />
                  <Stat
                    label="95% ±"
                    value={
                      Number.isFinite(s.ci95HalfWidthCm) ? `${s.ci95HalfWidthCm}cm` : "n/a"
                    }
                  />
                  <Stat label={current.name} value={`${current.value}`} />
                  <Stat
                    label="suggested"
                    value={suggested === current.value ? "unchanged" : `${suggested}`}
                  />
                </dl>
              )}
            </div>
          );
        })}
      </section>

      <section>
        <h2 className="font-mono text-[10px] tracking-widest text-mat-ink uppercase">
          Export — numbers only, safe to keep after deleting the photos
        </h2>
        <pre
          id="calibration-result"
          className="mt-2 max-h-96 overflow-auto bg-mat-2 p-4 font-mono text-xs text-tissue"
        >
          {exportPayload}
        </pre>
      </section>
    </main>
  );
}

function Num({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className="w-20 border border-graphite/25 bg-transparent px-1.5 py-1"
    />
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[9px] tracking-wide text-mat-ink uppercase">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

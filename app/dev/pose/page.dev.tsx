"use client";

import { useState } from "react";
import PhotoMeasure from "@/components/PhotoMeasure";
import type { MeasurementEstimate } from "@/lib/pose/measure";

/**
 * Development harness for the client-side pose path. Not part of the product
 * surface — it exists to exercise model loading and estimation against real
 * photos without wiring the full shopper flow first.
 */
export default function DevPosePage() {
  const [heightCm, setHeightCm] = useState(178);
  const [estimate, setEstimate] = useState<MeasurementEstimate | null>(null);

  return (
    <main className="mx-auto max-w-xl space-y-5 p-8">
      <div>
        <h1 className="font-display text-3xl uppercase">Pose harness</h1>
        <p className="mt-1 text-sm text-mat-ink">
          Dev only. Everything here runs in the browser; no photo is uploaded.
        </p>
      </div>

      <div className="bg-tissue p-4 text-graphite">
        <label className="block font-mono text-[11px] tracking-widest uppercase">
          Height (cm)
          <input
            type="number"
            value={heightCm}
            onChange={(e) => setHeightCm(Number(e.target.value))}
            className="mt-1 w-full border border-graphite/30 bg-transparent px-2 py-1 font-sans text-base"
          />
        </label>

        <div className="mt-4">
          <PhotoMeasure heightCm={heightCm} onEstimate={setEstimate} />
        </div>
      </div>

      {estimate && (
        <pre
          id="pose-result"
          className="overflow-x-auto bg-mat-2 p-4 font-mono text-xs text-tissue"
        >
          {JSON.stringify(estimate, null, 2)}
        </pre>
      )}
    </main>
  );
}

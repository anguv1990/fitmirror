"use client";

import { useCallback, useRef, useState } from "react";
import GarmentPicker from "@/components/GarmentPicker";
import PhotoSource, { type CapturedPhoto } from "@/components/PhotoSource";
import TryOnResult from "@/components/TryOnResult";
import type { Garment, TryOnResult as Result } from "@/lib/types";

type Status = "idle" | "loading" | "done" | "error";

export default function Home() {
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [garment, setGarment] = useState<Garment | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Guards against a slow first request overwriting a newer one's result.
  const requestId = useRef(0);

  const runTryOn = useCallback(
    async (nextPhoto: CapturedPhoto, nextGarment: Garment) => {
      const id = ++requestId.current;
      setStatus("loading");
      setError(null);

      try {
        const response = await fetch("/api/tryon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personImage: nextPhoto.dataUrl,
            personWidth: nextPhoto.width,
            personHeight: nextPhoto.height,
            garmentId: nextGarment.id,
          }),
        });

        const payload = await response.json();
        if (id !== requestId.current) return;

        if (!response.ok) {
          setError(payload.error ?? `The fit request failed (${response.status}).`);
          setStatus("error");
          return;
        }

        setResult(payload as Result);
        setStatus("done");
      } catch {
        if (id !== requestId.current) return;
        setError("Cannot reach the server. Check that it is running, then try again.");
        setStatus("error");
      }
    },
    [],
  );

  function handleCapture(next: CapturedPhoto) {
    setPhoto(next);
    if (garment) void runTryOn(next, garment);
  }

  function handleSelect(next: Garment) {
    setGarment(next);
    if (photo) void runTryOn(photo, next);
  }

  function handleClear() {
    setPhoto(null);
    setResult(null);
    setStatus("idle");
    setError(null);
    requestId.current++;
  }

  function handleRetry() {
    if (photo && garment) void runTryOn(photo, garment);
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
      <header className="mb-10">
        <h1 className="font-display text-5xl leading-[0.85] font-semibold tracking-tight uppercase sm:text-6xl">
          Fit<span className="wordmark-ghost">Mirror</span>
        </h1>
        <p className="mt-2 text-sm text-mat-ink">Check the fit before you buy.</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="grid gap-6">
          <Panel piece="A" title="Your photo">
            <PhotoSource
              photo={photo}
              onCapture={handleCapture}
              onClear={handleClear}
            />
          </Panel>

          <Panel piece="B" title="The garment">
            <GarmentPicker
              selectedId={garment?.id ?? null}
              onSelect={handleSelect}
              disabled={status === "loading"}
            />
          </Panel>
        </div>

        <Panel piece="C" title="The fit" tone="mat">
          <TryOnResult
            status={status}
            result={result}
            error={error}
            garmentName={garment?.name ?? null}
            onRetry={handleRetry}
          />
        </Panel>
      </div>
    </main>
  );
}

/**
 * A pattern piece on the table. Tissue panels hold input; the mat-toned panel
 * holds the mirror, so the result reads as the thing being looked at rather than
 * another form field.
 */
function Panel({
  piece,
  title,
  tone = "tissue",
  children,
}: {
  piece: string;
  title: string;
  tone?: "tissue" | "mat";
  children: React.ReactNode;
}) {
  const onTissue = tone === "tissue";
  return (
    <section
      className={`rounded-sm p-4 sm:p-5 ${
        onTissue
          ? "bg-tissue text-graphite shadow-[0_18px_40px_-28px_rgba(0,0,0,0.9)]"
          : "border border-chalk/20 bg-mat-2/60 text-tissue"
      }`}
    >
      <div className="mb-4 flex items-baseline gap-2.5">
        <span
          className={`font-mono text-[11px] leading-none ${
            onTissue ? "text-graphite/45" : "text-chalk"
          }`}
        >
          {piece}
        </span>
        <h2 className="font-display text-lg leading-none font-medium tracking-[0.14em] uppercase">
          {title}
        </h2>
        <span
          className={`h-px flex-1 translate-y-[-2px] ${
            onTissue ? "bg-graphite/15" : "bg-chalk/20"
          }`}
        />
      </div>
      {children}
    </section>
  );
}

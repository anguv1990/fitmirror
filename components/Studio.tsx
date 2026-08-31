"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import ConsentGate from "@/components/ConsentGate";
import GarmentPicker from "@/components/GarmentPicker";
import MeasurementForm from "@/components/MeasurementForm";
import PhotoSource, { type CapturedPhoto } from "@/components/PhotoSource";
import SizeRecommendation from "@/components/SizeRecommendation";
import TryOnResult from "@/components/TryOnResult";
import type { ProcessingDisclosure } from "@/lib/compliance/disclosure";
import type {
  BodyMeasurements,
  FitPreference,
  FitRecommendation,
  MeasurementSource,
} from "@/lib/fit/types";
import { DEFAULT_SIZE_CHART_ID } from "@/lib/fit/sizeCharts";
import type { Garment, TryOnResult as Result } from "@/lib/types";

type Status = "idle" | "loading" | "done" | "error";

interface Props {
  /**
   * What the active try-on provider does with the photo. Resolved on the server,
   * where `TRYON_PROVIDER` is readable. `null` means no disclosure is on file,
   * in which case the photo path stays shut — we cannot ask for consent to
   * something we cannot describe.
   */
  disclosure: ProcessingDisclosure | null;
  /**
   * The measurement path's facts. Separate from `disclosure` because the two
   * halves can now give different answers: measuring may run in the browser
   * while rendering always transmits.
   */
  measurementDisclosure: ProcessingDisclosure | null;
  measurementProvider: string;
}

export default function Studio({
  disclosure,
  measurementDisclosure,
  measurementProvider,
}: Props) {
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [garment, setGarment] = useState<Garment | null>(null);

  /**
   * Session-scoped and deliberately not persisted. Storing it would be a
   * retention decision, and it would also make consent survive a page the
   * shopper thought they had left.
   */
  const [consented, setConsented] = useState(false);

  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [measurements, setMeasurements] = useState<BodyMeasurements>({});
  const [measurementSource, setMeasurementSource] =
    useState<MeasurementSource>("declared");
  const [fitPreference, setFitPreference] = useState<FitPreference>("regular");
  const [sizeChartId, setSizeChartId] = useState(DEFAULT_SIZE_CHART_ID);

  const [fitStatus, setFitStatus] = useState<Status>("idle");
  const [fit, setFit] = useState<FitRecommendation | null>(null);
  const [fitError, setFitError] = useState<string | null>(null);
  /**
   * True from the moment an input changes until the new recommendation lands.
   * Without it the panel keeps showing the previous size during the debounce,
   * so changing fit preference looks like it did nothing.
   */
  const [fitStale, setFitStale] = useState(false);

  const [renderStatus, setRenderStatus] = useState<Status>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Guard against a slow request overwriting a newer one's result.
  const fitRequestId = useRef(0);
  const renderRequestId = useRef(0);

  const hasMeasurements = Object.values(measurements).some(
    (value) => typeof value === "number" && value > 0,
  );

  // Debounced: measurements come from typing, and the endpoint is free but the
  // result flickering on every keystroke is not useful.
  useEffect(() => {
    if (!hasMeasurements) {
      setFitStatus("idle");
      setFit(null);
      setFitStale(false);
      return;
    }

    setFitStale(true);
    const id = ++fitRequestId.current;
    const timer = setTimeout(async () => {
      setFitStatus("loading");
      setFitError(null);
      try {
        const response = await fetch("/api/fit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            measurements,
            sizeChartId,
            fitPreference,
            measurementSource,
          }),
        });
        const payload = await response.json();
        if (id !== fitRequestId.current) return;

        if (!response.ok) {
          setFitError(payload.error ?? `Request failed (${response.status}).`);
          setFitStatus("error");
          setFitStale(false);
          return;
        }
        setFit(payload as FitRecommendation);
        setFitStatus("done");
        setFitStale(false);
      } catch {
        if (id !== fitRequestId.current) return;
        setFitError("Could not reach the server.");
        setFitStatus("error");
        setFitStale(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [measurements, fitPreference, measurementSource, sizeChartId, hasMeasurements]);

  const runTryOn = useCallback(
    async (nextPhoto: CapturedPhoto, nextGarment: Garment) => {
      const id = ++renderRequestId.current;
      setRenderStatus("loading");
      setRenderError(null);

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
        if (id !== renderRequestId.current) return;

        if (!response.ok) {
          setRenderError(payload.error ?? `Request failed (${response.status}).`);
          setRenderStatus("error");
          return;
        }
        setResult(payload as Result);
        setRenderStatus("done");
      } catch {
        if (id !== renderRequestId.current) return;
        setRenderError("Could not reach the server.");
        setRenderStatus("error");
      }
    },
    [],
  );

  function handleCapture(next: CapturedPhoto) {
    setPhoto(next);
    if (garment) void runTryOn(next, garment);
  }

  function handleSelectGarment(next: Garment) {
    setGarment(next);
    if (photo) void runTryOn(photo, next);
  }

  function clearPhotoState() {
    setPhoto(null);
    setResult(null);
    setRenderStatus("idle");
    setRenderError(null);
    renderRequestId.current++;
  }

  function handleClearPhoto() {
    clearPhotoState();
  }

  /**
   * Withdrawal has to be worth the name: it drops the consent *and* everything
   * derived from the photo. Measurements the shopper typed are theirs and are
   * left alone; an estimate taken from the photo is not, so it goes.
   */
  function handleWithdraw() {
    setConsented(false);
    clearPhotoState();
    if (measurementSource === "estimated_from_photo") {
      setMeasurements({});
      setMeasurementSource("declared");
    }
  }

  function handleMeasurements(next: BodyMeasurements, source: MeasurementSource) {
    setMeasurements(next);
    setMeasurementSource(source);
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
            <div className="space-y-3">
              <ConsentGate
                disclosure={disclosure}
                measurementDisclosure={measurementDisclosure}
                granted={consented}
                onGrant={() => setConsented(true)}
                onWithdraw={handleWithdraw}
              />
              {consented && (
                <PhotoSource
                  photo={photo}
                  onCapture={handleCapture}
                  onClear={handleClearPhoto}
                />
              )}
            </div>
          </Panel>

          <Panel piece="B" title="Your measurements">
            <MeasurementForm
              heightCm={heightCm}
              measurements={measurements}
              fitPreference={fitPreference}
              sizeChartId={sizeChartId}
              photoDataUrl={photo?.dataUrl ?? null}
              measurementProvider={measurementProvider}
              onHeightChange={setHeightCm}
              onMeasurementsChange={handleMeasurements}
              onFitPreferenceChange={setFitPreference}
              onSizeChartChange={setSizeChartId}
            />
          </Panel>

          <Panel piece="C" title="The garment">
            <GarmentPicker
              selectedId={garment?.id ?? null}
              onSelect={handleSelectGarment}
              disabled={renderStatus === "loading"}
            />
          </Panel>
        </div>

        <div className="grid gap-6 lg:sticky lg:top-6">
          <section>
            <PanelHeading piece="D" title="Your size" tone="mat" />
            <SizeRecommendation
              status={fitStatus}
              recommendation={fit}
              error={fitError}
              stale={fitStale}
            />
          </section>

          <Panel piece="E" title="The mirror" tone="mat">
            <TryOnResult
              status={renderStatus}
              result={result}
              error={renderError}
              garmentName={garment?.name ?? null}
              onRetry={() => {
                if (photo && garment) void runTryOn(photo, garment);
              }}
            />
          </Panel>
        </div>
      </div>

      <footer className="mt-12 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-chalk/15 pt-4 font-mono text-[10px] tracking-widest text-mat-ink uppercase">
        <Link href="/privacy" className="underline underline-offset-2 hover:no-underline">
          What we do with your data
        </Link>
        <span>Photos are never stored</span>
      </footer>
    </main>
  );
}

function PanelHeading({
  piece,
  title,
  tone = "tissue",
}: {
  piece: string;
  title: string;
  tone?: "tissue" | "mat";
}) {
  const onTissue = tone === "tissue";
  return (
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
  );
}

/**
 * A pattern piece on the table. Tissue panels hold input; mat-toned panels hold
 * output, so the results read as the things being looked at.
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
      <PanelHeading piece={piece} title={title} tone={tone} />
      {children}
    </section>
  );
}

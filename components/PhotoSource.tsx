"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface CapturedPhoto {
  dataUrl: string;
  width: number;
  height: number;
}

interface Props {
  photo: CapturedPhoto | null;
  onCapture: (photo: CapturedPhoto) => void;
  onClear: () => void;
}

type Tab = "upload" | "camera";

export default function PhotoSource({ photo, onCapture, onClear }: Props) {
  const [tab, setTab] = useState<Tab>("upload");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Own the camera only while the camera tab is open and no photo is chosen.
  // Anything else — tab switch, capture, unmount — releases the device, so the
  // browser's in-use indicator never lingers.
  useEffect(() => {
    if (tab !== "camera" || photo) {
      stopCamera();
      return;
    }

    let cancelled = false;
    setCameraError(null);

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user", width: 1280, height: 960 } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCameraError(describeCameraError(error));
      });

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [tab, photo, stopCamera]);

  useEffect(() => stopCamera, [stopCamera]);

  const readFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result);
        const img = new Image();
        img.onload = () =>
          onCapture({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    },
    [onCapture],
  );

  function captureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Un-mirror: the preview is flipped so it reads as a mirror, but the saved
    // frame should match reality.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    onCapture({
      dataUrl: canvas.toDataURL("image/jpeg", 0.9),
      width: canvas.width,
      height: canvas.height,
    });
  }

  if (photo) {
    return (
      <div className="space-y-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.dataUrl}
          alt="The photo you added"
          className="tissue-in h-64 w-full border border-graphite/15 bg-tissue-2/40 object-contain"
        />
        <button
          onClick={onClear}
          className="w-full border border-graphite/25 py-2 font-mono text-[11px] tracking-widest text-graphite/70 uppercase transition hover:border-graphite hover:text-graphite"
        >
          Replace photo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div
        role="tablist"
        aria-label="Photo source"
        className="flex border-b border-graphite/20"
      >
        {(
          [
            ["upload", "Upload"],
            ["camera", "Camera"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`-mb-px border-b-2 px-3 pb-2 font-mono text-[11px] tracking-widest uppercase transition ${
              tab === value
                ? "border-graphite text-graphite"
                : "border-transparent text-graphite/45 hover:text-graphite/75"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "upload" ? (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) readFile(file);
          }}
          className={`flex h-64 cursor-pointer flex-col items-center justify-center gap-1.5 border-2 border-dashed px-6 text-center transition ${
            dragging
              ? "border-graphite bg-tissue-2/60"
              : "border-graphite/25 hover:border-graphite/50"
          }`}
        >
          <span className="font-display text-base tracking-wide text-graphite uppercase">
            Drop a full-length photo
          </span>
          <span className="font-mono text-[11px] tracking-wide text-graphite/50 uppercase">
            or browse
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) readFile(file);
            }}
          />
        </label>
      ) : (
        <div className="space-y-2.5">
          <div className="relative h-64 overflow-hidden border border-graphite/20 bg-graphite">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full -scale-x-100 object-cover"
            />
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-tissue px-6 text-center">
                <p className="text-sm text-graphite">{cameraError}</p>
                <button
                  onClick={() => setTab("upload")}
                  className="border border-graphite px-4 py-2 font-mono text-[11px] tracking-widest text-graphite uppercase transition hover:bg-graphite hover:text-tissue"
                >
                  Upload instead
                </button>
              </div>
            )}
          </div>
          <button
            onClick={captureFrame}
            disabled={!!cameraError}
            className="w-full bg-graphite py-2.5 font-mono text-[11px] tracking-widest text-tissue uppercase transition hover:bg-graphite/85 disabled:opacity-35"
          >
            Take the photo
          </button>
        </div>
      )}
    </div>
  );
}

function describeCameraError(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera access is blocked. Allow it in your browser's site settings, or upload a photo instead.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera found on this device.";
    case "NotReadableError":
      return "Another app is using the camera. Close it, then try again.";
    default:
      return "The camera did not start on this device.";
  }
}

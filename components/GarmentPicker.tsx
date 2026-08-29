"use client";

import { GARMENTS } from "@/lib/garments";
import type { Garment } from "@/lib/types";

interface Props {
  selectedId: string | null;
  onSelect: (garment: Garment) => void;
  disabled?: boolean;
}

export default function GarmentPicker({ selectedId, onSelect, disabled }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {GARMENTS.map((garment, index) => {
        const selected = garment.id === selectedId;
        return (
          <button
            key={garment.id}
            onClick={() => onSelect(garment)}
            disabled={disabled}
            aria-pressed={selected}
            className={`group relative flex flex-col gap-1.5 border p-2 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
              selected
                ? "border-solid border-graphite bg-tissue-2/50"
                : "border-dashed border-graphite/25 hover:border-graphite/60 hover:bg-tissue-2/30"
            }`}
          >
            {/* Piece number: real ordering information, matching the catalog. */}
            <span className="font-mono text-[10px] leading-none text-graphite/40">
              {String(index + 1).padStart(2, "0")}
            </span>

            <svg viewBox="0 0 100 140" className="h-20 w-full">
              <g dangerouslySetInnerHTML={{ __html: garment.art }} />
            </svg>

            <span className="font-display text-[13px] leading-tight tracking-wide text-graphite uppercase">
              {garment.name}
            </span>

            {selected && (
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-redline" />
            )}
          </button>
        );
      })}
    </div>
  );
}

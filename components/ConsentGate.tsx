"use client";

import Link from "next/link";
import { consentStatements, type ProcessingDisclosure } from "@/lib/compliance/disclosure";

interface Props {
  disclosure: ProcessingDisclosure | null;
  /** The measurement path, which may transmit or may stay on the device. */
  measurementDisclosure: ProcessingDisclosure | null;
  granted: boolean;
  onGrant: () => void;
  onWithdraw: () => void;
}

/**
 * Consent for the photo path, and only the photo path.
 *
 * Three things this is shaped by (`docs/03-compliance-uk.md` §2):
 *
 * 1. **Unbundled.** Its own checkbox and its own sentences. "I agree to the
 *    terms" is not consent to process a body photo.
 * 2. **Freely given.** It gates panel A alone — the measurements path in panel B
 *    stays open, so declining still leaves a working size recommendation. That
 *    alternative is what makes the choice real rather than a toll gate.
 * 3. **Withdrawable**, and withdrawal actually does something: it clears the
 *    photo and any render from the page.
 *
 * Consent is held in memory for the session only. Persisting it would be a
 * retention decision, and the strongest control here is that there is nothing
 * to retain.
 */
export default function ConsentGate({
  disclosure,
  measurementDisclosure,
  granted,
  onGrant,
  onWithdraw,
}: Props) {
  if (!disclosure || !measurementDisclosure) {
    return (
      <div className="border border-redline/50 bg-redline/5 p-3">
        <p className="text-sm text-graphite">
          The photo path is unavailable: this deployment has no processing
          disclosure on file, so we cannot tell you what would happen to your
          photo.
        </p>
        <p className="mt-2 font-mono text-[10px] tracking-wide text-graphite/60 uppercase">
          Enter your measurements in step B instead
        </p>
      </div>
    );
  }

  if (granted) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-graphite/15 pb-2.5">
        <span className="font-mono text-[10px] tracking-widest text-graphite/55 uppercase">
          Consent given for this visit
        </span>
        <button
          onClick={onWithdraw}
          className="font-mono text-[10px] tracking-widest text-redline uppercase underline underline-offset-2 transition hover:no-underline"
        >
          Withdraw and clear
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 border border-graphite/25 bg-tissue-2/40 p-3.5">
      <p className="font-mono text-[10px] tracking-widest text-graphite/55 uppercase">
        Before you add a photo
      </p>

      <ul className="space-y-1.5">
        {consentStatements(disclosure, measurementDisclosure).map((statement) => (
          <li key={statement} className="flex gap-2 text-sm leading-snug text-graphite">
            <span aria-hidden className="mt-[0.45rem] h-px w-2.5 shrink-0 bg-graphite/40" />
            <span>{statement}</span>
          </li>
        ))}
      </ul>

      <label className="flex cursor-pointer items-start gap-2.5 border-t border-graphite/15 pt-3">
        <input
          type="checkbox"
          checked={false}
          onChange={onGrant}
          className="mt-0.5 h-4 w-4 shrink-0 accent-graphite"
        />
        <span className="text-sm leading-snug text-graphite">
          I agree to my photo being processed to show the garment on me.
        </span>
      </label>

      <p className="text-xs leading-snug text-graphite/65">
        You don&rsquo;t have to. Step B gives you a size from measurements alone,
        with no photo at all.{" "}
        <Link
          href="/privacy"
          className="underline underline-offset-2 hover:no-underline"
        >
          What we do with your data
        </Link>
      </p>
    </div>
  );
}

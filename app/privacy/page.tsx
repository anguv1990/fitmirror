import type { Metadata } from "next";
import Link from "next/link";
import {
  getDisclosure,
  MEASUREMENT_DISCLOSURE,
  type ProcessingDisclosure,
} from "@/lib/compliance/disclosure";
import { getProvider } from "@/lib/tryon";

export const metadata: Metadata = {
  title: "What we do with your data · FitMirror",
  description:
    "Plain-English account of what FitMirror processes, why, and for how long.",
};

/** Request-time, for the same reason as the home page — see `app/page.tsx`. */
export const dynamic = "force-dynamic";

/**
 * The privacy one-pager. Facts about the render path are read from the active
 * provider's disclosure rather than typed here, so this page cannot quietly
 * describe a provider that is no longer running.
 */
export default function PrivacyPage() {
  const render = safeDisclosure();

  return (
    <main className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
      <Link
        href="/"
        className="font-mono text-[10px] tracking-widest text-mat-ink uppercase underline underline-offset-2 hover:no-underline"
      >
        Back to FitMirror
      </Link>

      <h1 className="mt-6 font-display text-4xl leading-[0.9] font-semibold tracking-tight uppercase sm:text-5xl">
        What we do
        <br />
        with your data
      </h1>

      <p className="mt-4 border-l-2 border-redline/70 pl-3 text-sm leading-relaxed text-mat-ink">
        FitMirror is a demonstration build, not a live retail service. This page
        describes what the software actually does today. It is written to be
        accurate rather than reassuring, and it is not legal advice.
      </p>

      <Section title="What we process">
        <p>Only two things, and only while you are using the page:</p>
        <ul className="mt-2 space-y-1.5">
          <Bullet>
            <strong className="font-medium text-tissue">Your measurements</strong> —
            height, and any of chest, waist or hip you choose to enter.
          </Bullet>
          <Bullet>
            <strong className="font-medium text-tissue">A photo</strong>, if you
            add one. You never have to. Measurements alone produce a size.
          </Bullet>
        </ul>
      </Section>

      <Section title="Why we are allowed to">
        <p>
          Consent, and nothing else. You give it with a specific tick box before
          the photo panel opens, you can withdraw it at any time, and withdrawing
          clears the photo and anything derived from it. Declining leaves the
          measurement path fully working — that is what makes the choice a real
          one.
        </p>
      </Section>

      <Section title="Where your photo actually goes">
        <p className="text-mat-ink">
          Two different paths, with genuinely different answers. It is worth being
          precise about which is which.
        </p>

        <PathCard
          heading="Measuring you from the photo"
          disclosure={MEASUREMENT_DISCLOSURE}
        />
        <PathCard heading="Rendering the garment on you" disclosure={render} />
      </Section>

      <Section title="How long we keep it">
        <p>
          Nothing is kept. No photo, no measurement, and no result is written to a
          database, a disk or object storage at any point. They exist in memory
          for the length of a single request and are gone when it finishes.
        </p>
        <p className="mt-2">
          This is deliberate, and it is the strongest control on this page.
          Retention policies are things an organisation can fail to honour. There
          is no deletion process here because there is nothing to delete.
        </p>
      </Section>

      <Section title="What we deliberately do not do">
        <ul className="space-y-1.5">
          <Bullet>
            <strong className="font-medium text-tissue">
              No face recognition, ever.
            </strong>{" "}
            We read body pose landmarks — shoulders, hips — and never extract
            facial features or build a face template. Under UK GDPR, biometric
            data becomes special category data when it is used to identify
            someone. We do not identify anyone, and the software is built so that
            it cannot.
          </Bullet>
          <Bullet>
            <strong className="font-medium text-tissue">
              No accounts, no tracking, no advertising.
            </strong>{" "}
            We do not know who you are between visits, because we store nothing
            that would tell us.
          </Bullet>
          <Bullet>
            <strong className="font-medium text-tissue">
              No claim to have measured you.
            </strong>{" "}
            A photo has no absolute scale, so estimates are approximations from
            population averages, with a known tendency to under-read width. Every
            estimate says so. A size recommendation is a suggestion, not a
            promise about how a garment will fit.
          </Bullet>
        </ul>
      </Section>

      <Section title="Your rights">
        <p>
          Access, correction, erasure, objection and portability all apply under
          UK GDPR. In practice most are already satisfied by the design: there is
          no stored record to access, correct, erase or port. Withdrawing consent
          on the page removes everything held about you in that moment. For
          anything else, contact whoever is running this deployment.
        </p>
      </Section>

      <p className="mt-10 border-t border-chalk/15 pt-4 font-mono text-[10px] leading-relaxed tracking-wide text-mat-ink uppercase">
        Reviewed against docs/03-compliance-uk.md · Demonstration build
      </p>
    </main>
  );
}

function safeDisclosure(): ProcessingDisclosure | null {
  try {
    return getDisclosure(getProvider().name);
  } catch {
    return null;
  }
}

/** One processing path, stated as facts rather than paragraphs. */
function PathCard({
  heading,
  disclosure,
}: {
  heading: string;
  disclosure: ProcessingDisclosure | null;
}) {
  if (!disclosure) {
    return (
      <div className="mt-3 border border-redline/50 p-3 text-sm text-mat-ink">
        <p className="font-mono text-[10px] tracking-widest text-redline uppercase">
          {heading}
        </p>
        <p className="mt-1.5">
          Unavailable in this deployment — no processing disclosure is on file, so
          the photo path is switched off.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 border border-chalk/20 bg-mat-2/50 p-3">
      <p className="font-mono text-[10px] tracking-widest text-chalk uppercase">
        {heading}
      </p>
      <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <Row label="Handled by">{disclosure.engine}</Row>
        <Row label="Leaves your device">
          {disclosure.photoLeavesDevice ? "Yes" : "No — it stays in your browser"}
        </Row>
        <Row label="Anyone else involved">
          {disclosure.processor ?? "No one outside this application"}
        </Row>
        <Row label="Processed in">
          {disclosure.processingRegion ?? (
            <span className="text-redline">
              Not yet confirmed — so we are not claiming it stays in the UK
            </span>
          )}
        </Row>
        <Row label="Stored afterwards">
          {disclosure.photoRetained ? "Yes" : "No"}
        </Row>
        <Row label="Result is AI-generated">
          {disclosure.aiGenerated ? "Yes, and it is labelled as such" : "No"}
        </Row>
      </dl>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="font-mono text-[10px] tracking-wide text-mat-ink uppercase sm:pt-0.5">
        {label}
      </dt>
      <dd className="mb-1.5 text-tissue sm:mb-0">{children}</dd>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg leading-none font-medium tracking-[0.14em] text-tissue uppercase">
        {title}
      </h2>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-mat-ink">
        {children}
      </div>
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span aria-hidden className="mt-[0.55rem] h-px w-2.5 shrink-0 bg-chalk/50" />
      <span>{children}</span>
    </li>
  );
}

# FitMirror — Handoff

**Last updated:** 2026-08-30, 11:00 session
**Status:** Fit path and compliance surface complete. Render path still gated.
**Read this first.** It is the resume point if work is interrupted.
**Lost the thread entirely?** Read `06-build-playbook.md` instead — it starts from zero and tells you what
to type.

> **Where things stand.** Build items 1, 2, 4 and 6 from `02-architecture.md` §8 are done and on `main`:
> the fit engine, `POST /api/fit`, client-side pose estimation, and the wired UI. **Gate G10 closed on
> 2026-08-30** — consent, AI labelling and the privacy notice are built (§5b). 55 tests passing.
> All feature branches are merged and deleted; `main` is the single source of truth.
>
> **Items 3 and 5 (Vertex render, live upload) remain blocked** on gates only the product owner can clear.
> Nothing further can be built on the render path until then.

---

## 1. What we are building

An **API-first virtual try-on and fit-recommendation service** for online apparel retail.

A shopper supplies either a photo or their measurements. The service returns:

1. a rendered image of the selected product on that person, and
2. a **recommended size** with a confidence score and a plain-English reason.

**Business thesis:** UK clothing returns run ~23.6%, and fit/sizing is the single largest cause at
~50–53% of apparel returns. "Bracketing" (ordering 2–3 sizes intending to return most) is now mainstream
behaviour. Reducing size-mismatch returns is where the money is.

**Context:** MVP demo for a hackathon. Author's background is UK retail. Security and legal compliance are
treated as first-class, not bolt-on.

---

## 2. Decisions locked (confirmed with the product owner)

| # | Decision | Choice | Why |
|---|---|---|---|
| D1 | Scope | **Both try-on + fit rec, with fit rec as the hero** | Visual is the wow-factor; fit rec is the business case |
| D2 | Demo photo source | **Licensed / synthetic model photos** | No third-party personal data → no DPIA blocker, reproducible on stage |
| D3 | Try-on engine | **Google Vertex AI Virtual Try-On (`virtual-try-on-001`)** | Commercially licensed, C2PA/SynthID watermarked, no GPU infra |
| D4 | Timeline | **1–2 weeks to demo** | Constrains scope to one garment category |

### The decision that matters most

**D3 exists because the open-source route is commercially poisoned.** IDM-VTON and CatVTON — the two best
open-source try-on models — are both **CC BY-NC-SA 4.0: commercial use prohibited** without a separate
licence. They are fine for a hackathon and unusable in a product. Choosing a licensed engine now avoids
building a demo we would have to throw away. See `01-landscape.md`.

---

## 3. Current state of the repo

Everything is on **`main`** (`6e90f07`). No open branches, no open PRs. PRs #1–#4 all merged.

```
lib/fit/          recommendation engine, size charts, types      ← the hero
lib/pose/         MediaPipe landmarks → measurements, estimator
lib/tryon/        provider interface + mock (NOT real try-on)
lib/compliance/   per-provider processing facts; consent + label copy
app/api/fit/      POST recommendation, GET chart discovery
app/api/tryon/    POST render (mock provider only)
app/privacy/      the privacy one-pager
app/dev/pose/     dev harness for pose calibration
components/       Studio, ConsentGate, PhotoSource, MeasurementForm,
                  GarmentPicker, SizeRecommendation, TryOnResult, PhotoMeasure
docs/             this handoff + landscape, architecture, compliance, gates, privacy
```

**Setup after clone:** `npm install`, then **`npm run setup:pose`** (vendors ~15MB of MediaPipe model +
WASM into a gitignored folder). Skipping the second step silently breaks photo measurement.

**Checks:** `npm test` (55), `npm run typecheck`, `npm run lint`, `npm run build` — all clean on `main`.

### Adding the Vertex renderer is one file

`lib/tryon/` already has the seam: `TryOnProvider` interface, env-driven resolver (`TRYON_PROVIDER`), and a
mock default. Adding Vertex = write `lib/tryon/vertex.ts`, register it in `lib/tryon/index.ts`. Nothing else
changes.

`lib/tryon/replicate.ts` is a **non-functional** worked example — its `garmentImageUrl` throws by design.
Delete or replace it when a real provider lands.

### What the mock does NOT do

`lib/tryon/mock.ts` overlays garment artwork at fixed coordinates. **No body detection, no segmentation, no
pose warping. It is not virtual try-on.** Responses carry `simulated: true` and the UI labels them. This is
the single most likely thing for a newcomer to misread.

---

## 4. Open items blocking implementation

These are gates, not tasks. Implementation should not start until they are cleared.
Full detail in `04-prerequisite-gate.md`.

| # | Item | Status | Owner |
|---|---|---|---|
| G1 | Confirm `virtual-try-on-001` is available in an **EU/UK region** | ❓ **UNVERIFIED** — not stated in public docs | You (GCP console) |
| G2 | Confirm **exact per-image price** of Virtual Try-On | ❓ **UNVERIFIED** — not published in docs we could reach | You (GCP console / pricing calc) |
| G3 | GCP project + billing + **budget alert and hard cap** | Not started | You |
| G4 | Source a licensed/synthetic model image set | Not started | You |
| G5 | Source a real brand **size chart** with body measurements | ✅ **Cleared** — Boden (women's) + Seasalt (men's) | Done |
| G6 | Decide: does the live demo allow **audience uploads**? | Open | You |
| G7 | Vertex model access + least-privilege service account | Not started | You (after G1–G3) |
| G8 | **Bias calibration against real photos** | 🟡 In progress — see §5c | Either |
| G9 | Pre-generate demo renders so the demo runs offline | Not started | Either |
| G10 | Consent copy, AI-generated label, privacy one-pager | ✅ **Cleared** — see §5b | Done |

**G1 and G2 are genuinely unresolved.** We could not confirm either from public documentation. Do not
assume EU availability or a price — both must be checked in the console before this architecture is
committed to. If G1 fails, the compliance story in `03-compliance-uk.md` changes materially.

**G6 changes the legal position.** Synthetic-only (D2) needs no DPIA. Audience upload does.

---

## 5. Pick up here at 11:00

**Blocked on you — nothing else can start until these move:**

1. **G1** — is `virtual-try-on-001` available in an EU/UK region? GCP console. Console lookup, minutes.
2. **G2** — exact per-image price. Console / pricing calculator.
3. **G3** — budget alert + hard cap, **before the first API call**.
4. **G6** — do audience uploads happen at the demo? Yes ⇒ a DPIA is required first.

**Buildable without any gate, if you want progress in parallel:**

5. **G8 — calibrate the pose estimator against real photos.** This is the most valuable unblocked work.
   The estimator has *only ever* seen synthetic landmarks in tests. Its width-to-circumference multipliers
   (`SHOULDER_TO_CHEST_CIRCUMFERENCE = 2.45`, `HIP_WIDTH_TO_CIRCUMFERENCE = 3.1` in `lib/pose/measure.ts`)
   are population averages, uncalibrated. Use `/dev/pose` with real full-length photos across a range of
   body types and compare against tape measurements.
6. **G9 — pre-generate the demo renders** so the scripted path costs nothing and cannot fail on venue wifi.
7. Polish the fit UI, or add garment-category awareness to the chart selection.

**Do not start** the Vertex provider until G1–G3 are green. That is the whole point of the gate.

## 5b. The compliance surface (G10, done 2026-08-30)

Consent, the AI-generated label and the privacy one-pager are built and wired. The design decision worth
knowing before touching any of it:

**The disclosure text is generated from the code, not written alongside it.** `lib/compliance/disclosure.ts`
holds one record per provider — photo leaves the device?, third party?, region established?, retained?,
AI-generated? — and `ConsentGate`, `TryOnResult` and `/privacy` all render from it. Verified by running with
`TRYON_PROVIDER=replicate`: the consent copy named Replicate and flipped AI-generated to yes with no copy
edited. A provider with no disclosure throws, which closes the photo path rather than asking for consent to
something the app cannot describe.

Three things here are load-bearing and should not be "tidied":

- **The consent gates panel A only.** Panel B still produces a size from typed measurements. That
  alternative is what makes consent freely given rather than a toll gate; removing it changes the legal
  position, not just the UX.
- **`simulated` and `aiGenerated` are separate flags.** The mock composites artwork, so it is *not*
  AI-generated. Collapsing them into one flag would make the label a false statement.
- **`processingRegion` stays `null` while G1 is open**, and the UI says the location is unconfirmed. A test
  fails if an unestablished region ever produces an affirmative "Processing happens in: …" claim. **When G1
  closes, set the region in `disclosure.ts` — do not edit any copy.**

`app/page.tsx` and `app/privacy/page.tsx` are `force-dynamic` for a reason: prerendering baked in the build
machine's provider, which would have shown consent copy describing a provider that was not running.

**Not done:** no named controller or contact address (left blank rather than invented), no lawyer/DPO
review, and this copy is written for the D2 position — **if G6 comes back YES, it needs a review and a DPIA
first, not a first draft**. See `05-privacy-notice.md` §6.

## 5a. What is built, and what it deliberately does not do

**The fit engine** (`lib/fit/`): weighted band matching (chest 0.6 / waist 0.25 / hip 0.15), fit-preference
applied as ease before matching, confidence scoring, plain-English explanation. Makes **no network calls**,
so the business-case demo survives the render path being rate-limited or switched off.

**Pose estimation** (`lib/pose/`): runs in the browser. The photo never leaves the device; only derived
numbers reach the server. Requires declared height — a photo has no absolute scale. **Waist is never
estimated**: no landmark supports it and individual variation is far too wide to interpolate honestly.

**Size charts**: both real. Boden UK womenswear (default) and Seasalt Cornwall menswear, both confirmed
*body* not *garment* measurements from each retailer's own instructions, both verified against the live DOM.

### Deliberate honesty constraints — do not "fix" these

- **Confidence caps at 0.95.** Garment cut varies within a size, so certainty is never claimed
  (`03-compliance-uk.md` §5).
- **`sizeChartVerified` travels to the UI.** Any placeholder chart added later shows a caveat.
- **Photo-derived measurements always carry the width-under-read bias caveat.** Never suppress it.
- **Pose landmarks only, never face embeddings** — that would make this biometric data under UK GDPR
  (`03-compliance-uk.md` §1).
- **Three more added with G10 — see §5b:** the consent gates panel A only, `simulated` and `aiGenerated`
  stay separate flags, and `processingRegion` stays `null` until G1 actually closes.

### Bugs found during verification — the failure modes this code drifts toward

All five came from real data or real browsers, not unit tests:

1. A 150cm chest was recommended **XS** — linear decay floored all far-out sizes at 0, so the sort returned
   the first entry. Now decays asymptotically.
2. A 135cm bust was recommended **UK 4** — decay normalised by band width, so a wide band beat a nearer
   narrow one. Now uses absolute centimetres.
3. Confidence could reach **1.0**.
4. A 95cm chest in Seasalt's S/M gap was reported **off-chart**. Off-chart now tests the chart's overall
   span, not band membership.
5. Fit-preference explanations quoted the raw measurement against the eased match
   ("98cm is above M (96–101cm)"). Both branches now state the eased figure.

**The pattern:** 1 and 2 are the same bug shape (ranking far-out sizes by a relative measure). 5 recurred
because the in-range branch was fixed and the out-of-range branch was missed. Real charts have gaps and
open-ended bands that invented ones do not.

## 5d. The measurement seam (2026-08-31)

`lib/measure/` now mirrors `lib/tryon/`. `MEASUREMENT_PROVIDER` selects the provider; default `local`.

- `local` — MediaPipe in the browser. Free, offline, **photo never leaves the device**.
- `3dlook` — registered, disclosed, and **deliberately non-functional**. Its request mapping is unverified
  because Mobile Tailor's API reference sits behind an Enterprise agreement (gate G11), and guessing field
  names would mis-assign measurements silently. It throws rather than guessing.

**Verified by running with `MEASUREMENT_PROVIDER=3dlook`:** the consent copy gained "To measure you, it is
also sent to 3DLOOK, Inc. (3dlook.ai)", `/privacy` switched the measurement card to 3DLOOK and kept the
region unconfirmed (G12), and the local-only reassurance disappeared. No copy was hand-edited.

**The routing rule that matters:** `runsOn: "browser"` and "the photo stays on the device" are the same
statement. `lib/measure/client.ts` routes on exactly that — `local` runs in the browser, anything else goes
to `POST /api/measure`. Keeping one rule behind both the behaviour and the privacy claim is what stops them
drifting.

**Hip is now marked `unreliable`** and excluded from the size recommendation by `toBodyMeasurements()`,
while its explanation still reaches the shopper. Verified in-browser: a real photo produced chest 100.3cm,
an empty hip field, both caveats visible, and UK 16 at 64% confidence — lower than the 81% from typed
measurements, because the fit engine correctly discounts partial data. **This was my call, not yours** — it
is one line to reverse via `includeUnreliable`, and the alternative was feeding a number we have evidence
is ~30cm wrong into a size recommendation.

---

## 5c. Pose calibration, first real run (G8, 2026-08-30)

Harness at **`/dev/calibrate`**; statistics in `lib/pose/calibration.ts`. Browser-only, photos never
uploaded, export is numbers-only so findings outlive the images.

**The headline: the first six real photos found two defects in a path that 13 tests had been passing.**

1. **Back views were accepted** and returned a confident chest measurement. The rotation gate compares
   shoulder *depth*, which cannot tell "square-on facing you" from "square-on facing away". Fixed with a
   `facing_away` gate on left/right x ordering, verified against real MediaPipe output.
2. **The synthetic fixture was mirrored** — it placed the subject's left shoulder at the lower x, so every
   pose test had been running against a back-to-front body. That is why defect 1 survived.

**Still open, and do not paper over it:** hip estimates came out at **72.1cm and 66.7cm** against chests
near 100cm, which is not a plausible adult. The cause is structural rather than calibration —
`HIP_WIDTH_TO_CIRCUMFERENCE = 3.1` is applied to MediaPipe's hip **joint centres** (~23cm apart), not the
outer hip breadth (~35cm). Shoulder breadth resolves to ~40.9cm, so the scale itself is fine. Decide
whether to use different landmarks or stop emitting `hipCm` from photos, as waist already does. **Do not
just raise the constant to 4.3** — that fits the symptom.

**Not yet possible:** the actual error. That needs a confirmed height (175cm was assumed) and tape
measurements. `MIN_SUBJECTS_FOR_MULTIPLIER_CHANGE = 8` deliberately blocks any multiplier change until
there are 8 distinct **people** — six photos of one person is one observation repeated six times, and the
documented bias varies by sex, so a single-subject sample cannot detect it even in principle.

**Calibration photos live in `assets/`, gitignored.** They are personal data. They stay on the machine that
captured them.

---

## 6. Document map

| File | What it covers |
|---|---|
| `HANDOFF.md` | This file. State, decisions, blockers, next actions. |
| `01-landscape.md` | Market analysis, build-vs-buy, licensing traps, cost comparison |
| `02-architecture.md` | Enterprise MVP architecture, API design, cost controls |
| `03-compliance-uk.md` | UK GDPR position, DPIA trigger, security controls, AI transparency |
| `04-prerequisite-gate.md` | The checklist that must be green before coding |
| `05-privacy-notice.md` | Consent copy, AI labelling, the privacy notice, and why they are generated |
| `06-build-playbook.md` | **Start here if you have lost the thread.** Phases, goals, paste-ready prompts, which skills and agents to use, cost control, memory scopes |
| `07-body-measurement-buy-vs-build.md` | 3DLOOK / Mobile Tailor evaluation, SMPL licensing trap, the `MeasurementProvider` seam, gates G11–G15 |
| `08-vton-2026-and-next.md` | **Strategy update.** Google shipped free try-on into UK Search; fit-aware VTON is the 2026 frontier |
| `../ONBOARDING.md` | Team onboarding guide (repo root). Untracked — see §8. |

---

## 7. Explicit non-goals for the MVP

No checkout, no payments, no user accounts, no persistence of shopper photos beyond a single request,
no mobile app, no multi-brand catalogue, no production SLA. Footwear and tailoring are out — see
`02-architecture.md` for why one garment category is the right call at this timeline.

---

## 8. Loose ends

- **`ONBOARDING.md` is untracked** at the repo root. It is complete — team name FitMirror, no starter task,
  tips drawn from the repo conventions — but was never committed. Decide whether it belongs in this repo or
  in team docs.
- **`lib/tryon/replicate.ts` is dead weight.** Non-functional by design; delete or replace when a real
  provider lands.
- **`app/dev/pose` ships in the production build.** Harmless and clearly labelled dev-only, but it is a
  route on the public surface. Remove before anything real.
- **Two `postcss` advisories** via Next 15, build-time CSS processing only. Fix requires Next 16, a major
  upgrade. Deliberately left alone.
- **Mobile layout is unverified.** The browser tooling could not emulate a viewport; responsive behaviour is
  inspection-only. Worth a real device check before the demo.

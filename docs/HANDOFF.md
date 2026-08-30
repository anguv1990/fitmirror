# FitMirror — Handoff

**Last updated:** 2026-08-30
**Status:** Fit path complete and merged to `main`. Render path still gated.
**Next session:** 2026-08-30, 11:00.
**Read this first.** It is the resume point if work is interrupted.

> **Where things stand.** Build items 1, 2, 4 and 6 from `02-architecture.md` §8 are done and on `main`:
> the fit engine, `POST /api/fit`, client-side pose estimation, and the wired UI — 42 tests passing.
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
app/api/fit/      POST recommendation, GET chart discovery
app/api/tryon/    POST render (mock provider only)
app/dev/pose/     dev harness for pose calibration
components/       PhotoSource, MeasurementForm, GarmentPicker,
                  SizeRecommendation, TryOnResult, PhotoMeasure
docs/             this handoff + landscape, architecture, compliance, gates
```

**Setup after clone:** `npm install`, then **`npm run setup:pose`** (vendors ~15MB of MediaPipe model +
WASM into a gitignored folder). Skipping the second step silently breaks photo measurement.

**Checks:** `npm test` (42), `npm run typecheck`, `npm run lint`, `npm run build` — all clean on `main`.

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
| G8 | **Bias calibration against real photos** | Open — see §6 | Either |
| G9 | Pre-generate demo renders so the demo runs offline | Not started | Either |
| G10 | Consent copy, AI-generated label, privacy one-pager | Not started | Either |

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

---

## 6. Document map

| File | What it covers |
|---|---|
| `HANDOFF.md` | This file. State, decisions, blockers, next actions. |
| `01-landscape.md` | Market analysis, build-vs-buy, licensing traps, cost comparison |
| `02-architecture.md` | Enterprise MVP architecture, API design, cost controls |
| `03-compliance-uk.md` | UK GDPR position, DPIA trigger, security controls, AI transparency |
| `04-prerequisite-gate.md` | The checklist that must be green before coding |
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

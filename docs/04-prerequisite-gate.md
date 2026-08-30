# 04 — Prerequisite Gate

**Rule: implementation does not start until every P0 is green.** This exists because the brief was
explicit — no jumping into code until the checks are met.

Tick items as you clear them. This file is the shared source of truth for readiness.

---

## P0 — Blocking. Nothing starts until these are done.

### G1 · Confirm Virtual Try-On is available in an EU/UK region
- [ ] Open GCP console → Vertex AI → Model Garden → Virtual Try-On
- [ ] Check the region selector for `europe-west*`
- [ ] Cross-check the [Generative AI locations page](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/locations)

**Status: ❓ UNVERIFIED.** Public docs do not state supported regions. **Do not assume EU availability.**
**If it fails:** not fatal — see `03-compliance-uk.md` §7. Mitigation is D2 (synthetic images) plus
client-side pose, which keeps the MVP defensible. But the demo narrative must change, so find out now.

### G2 · Confirm exact per-image price of `virtual-try-on-001`
- [ ] GCP Pricing Calculator, or console → Billing → Pricing
- [ ] Record: price per image, and whether the 4-image sample count multiplies cost
- [ ] Compare against FASHN (~$0.075, <$0.04 at volume)

**Status: ❓ UNVERIFIED.** Not published anywhere we could reach. **The £/$ figures in `02-architecture.md`
are a proxy, not a budget.** If Vertex is materially more expensive than FASHN, reopen decision D3.

### G3 · Billing guardrails — before the first API call
- [ ] GCP project created, dedicated to this work (not shared with anything else)
- [ ] Billing account linked
- [ ] **Budget alert** at 50% / 90% / 100% of an agreed cap
- [ ] **Hard spend cap** or a kill-switch function on budget breach
- [ ] Agree the cap number and record it here: `£________`

**Do this before any API call, not after the first bill.** A misconfigured loop against a
per-image-priced generative endpoint is the standard way hackathon projects generate a four-figure
invoice.

### G6 · Decide: does the live demo accept audience uploads?
- [ ] Decision recorded: **YES / NO**

**If NO** (recommended, and consistent with D2): no DPIA, no consent infrastructure, demo is reproducible.
**If YES:** a DPIA is required *before* the demo, plus consent capture, retention rules, and a deletion
path. That is days of work, not hours. Decide early.

---

## P1 — Needed for a working demo

### G4 · Licensed or synthetic model images
- [ ] Source 5–10 full-length model photos, upper-body garments visible
- [ ] **Licence permits demo/commercial display** — record the licence per asset
- [ ] Deliberately span body types, sizes and skin tones (see `03-compliance-uk.md` §6)
- [ ] Store under `public/demo/` with a `LICENCES.md` recording provenance

Options: licensed stock (Shutterstock/Getty — check the AI-processing terms specifically, some licences
prohibit it), or AI-generated model photos (no real data subject at all — cleanest).

### G5 · A real brand size chart — ✅ CLEARED
- [x] **Womenswear:** [Boden UK](https://www.boden.com/pages/womens-size-fit-chart), retrieved 2026-08-29
      (`boden-womens`, demo default)
- [x] **Menswear:** [Seasalt Cornwall](https://www.seasaltcornwall.com/size-guide), retrieved 2026-08-29
      (`seasalt-mens`)
- [x] Both confirmed *body* not *garment* measurements, from each chart's own "How to measure" wording
- [x] Both verified against the live DOM table, not just an extraction
- [x] Sources and retrieval dates recorded in `lib/fit/sizeCharts.ts`

No placeholder data ships any more. The `verified` flag and its UI caveat remain in place so anything added
later cannot pass as authoritative.

### G7 · Verify Vertex model access
- [ ] Vertex AI API enabled on the project
- [ ] Service account created with **least privilege** (predict only, no storage write)
- [ ] Confirm no allowlist/approval is required for `virtual-try-on-001`
- [ ] Make one successful test call and record latency

Some Google generative models require access approval. Find out before demo week.

---

## P2 — Quality and credibility

### G8 · Pose calibration and bias spot-check — **in progress**

Harness: `/dev/calibrate`. Statistics: `lib/pose/calibration.ts`. Everything runs in the browser; photos
are never uploaded and the export contains numbers only, so findings survive deleting the images.

**First run against real photos, 2026-08-30** — six photos, one subject, assumed height 175cm (unconfirmed).
Two defects surfaced immediately, from a path that had until then only ever seen synthetic landmarks.

- [x] **Fixed — back views were accepted.** A photo taken from behind returned a confident 99.8cm chest.
      The rotation gate compares left/right shoulder *depth*, which is near zero for someone square-on
      facing away just as it is for someone facing you. Added a `facing_away` gate on left/right x ordering,
      verified against real MediaPipe output (front: `LEFT_SHOULDER.x` 0.562 > `RIGHT_SHOULDER.x` 0.435;
      back: 0.474 < 0.612). Regression test added.
- [x] **Fixed — the synthetic test fixture was mirrored.** It placed the subject's left shoulder at the
      lower x, i.e. it described someone facing away. Every pose test had been passing against a
      back-to-front body. This is why the defect above survived 13 tests.
- [ ] **Open — hip estimates are far too small, and the cause is structural, not calibration.**
      Both accepted photos gave hips of **72.1cm and 66.7cm** against chests near 100cm. An adult hip
      circumference is normally at or above the chest.
      Working back: shoulder breadth resolves to ~40.9cm, which is right for an adult, so the *scale* is
      sound. The hip landmarks resolve to ~23.3cm apart — MediaPipe's landmarks 23/24 sit at the **hip
      joint centres**, not the outer hip breadth (~35cm). `HIP_WIDTH_TO_CIRCUMFERENCE = 3.1` is being
      applied to the wrong anatomical distance, and would need to be ≈4.3 to land near a real hip.
      **Do not simply retune it** — decide first whether to derive hip width from a different landmark
      pair, or stop emitting `hipCm` from photos the way waist already is.
      Note `66.7` cleared the plausibility floor of 60cm, so that guard did not catch it either.
- [ ] Obtain tape measurements + confirmed height to quantify the chest error
- [ ] Widen the sample: **8 distinct people minimum** before any multiplier changes
      (`MIN_SUBJECTS_FOR_MULTIPLIER_CHANGE`). Six photos of one person is one observation repeated.
- [ ] Span body types, sizes and skin tones (`03-compliance-uk.md` §6)

**Chest estimates were internally consistent** across the three accepted photos (100.3 / 99.8 / 103.2cm),
which is evidence of repeatability but says nothing about accuracy until there is a tape measurement to
compare against. All figures scale linearly with declared height, which is currently a guess.

### G9 · Demo resilience
- [ ] Pre-generate every render on the scripted happy path (`02-architecture.md` §5, layer 2)
- [ ] Confirm the demo runs with **wifi disabled**
- [ ] Fit-recommendation path verified to work with zero paid API calls

### G10 · Compliance artefacts — ✅ CLEARED
- [x] **Consent copy** — `components/ConsentGate.tsx`, gating the photo panel only. Built regardless of
      G6: the photo path exists today, so it needs consent today. If G6 comes back YES it needs a further
      review, not a first draft.
- [x] **"AI-generated" label visible in UI** — on the image itself, from `renderLabel()`.
      `simulated` and `aiGenerated` are separate flags; the mock composites artwork and is correctly
      **not** labelled AI-generated.
- [x] **One-page privacy note** — `/privacy`, plus `05-privacy-notice.md` recording the reasoning.
- [x] Consent and privacy copy **generated from** `lib/compliance/disclosure.ts` rather than hand-written,
      so changing `TRYON_PROVIDER` changes the disclosure. Verified by swapping to `replicate` and
      confirming the copy names Replicate and flips AI-generated to yes.
- [x] A test asserts every registered provider has a disclosure on file, and that no unestablished region
      produces an affirmative "Processing happens in: …" claim while G1 is open.

**Still open within G10:** no named controller or contact address (left blank rather than invented), and
no lawyer/DPO review. See `05-privacy-notice.md` §6.

---

## Gate summary

| Gate | Priority | Status |
|---|---|---|
| G1 EU region | P0 | ❓ Unverified |
| G2 Pricing | P0 | ❓ Unverified |
| G3 Budget cap | P0 | ⬜ Not started |
| G6 Upload decision | P0 | ⬜ Open |
| G4 Model images | P1 | ⬜ Not started |
| G5 Size chart | P1 | ✅ Cleared |
| G7 Vertex access | P1 | ⬜ Not started |
| G8 Bias check | P2 | 🟡 In progress — 2 defects fixed, hip issue open |
| G9 Demo resilience | P2 | ⬜ Not started |
| G10 Compliance artefacts | P2 | ✅ Cleared |

**Four P0s. Two are console lookups (G1, G2), one is a 10-minute config (G3), one is a decision (G6).**
Realistically an hour of work — but it determines whether the rest of the plan holds.

---

## What happens after the gate

Once P0s are green, the next conversation is the tech-stack confirmation (`02-architecture.md` §7) and
then implementation in the order set out in `02-architecture.md` §8. Update `HANDOFF.md` §4 as gates
close, so the handoff stays accurate for whoever picks the work up next.

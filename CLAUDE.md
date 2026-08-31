# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install && npm run setup:pose   # setup:pose is required — see below
npm run dev                         # localhost:3000
npm test                            # vitest, lib/**/*.test.ts only
npm test -- recommend               # a single file by name substring
npm run typecheck                   # tsc --noEmit
npm run lint                        # eslint (flat config)
npm run build
```

**`npm run setup:pose` is not optional after a clone.** It vendors ~15MB of MediaPipe model + WASM into
`public/mediapipe/` (gitignored). Skip it and photo measurement fails silently — the rest of the app still
runs, so the breakage is easy to misdiagnose.

After switching branches, a stale `.next/types` can fail `typecheck`. `rm -rf .next` clears it.

**Do not run `npm run build` while `npm run dev` is running.** They share `.next`, and the build replaces
chunks the dev server still expects. The symptom is misleading: pages render but never hydrate, API routes
return HTML with `Cannot find module './NNN.js'`, and UI state silently resets — which looks like a React
bug. Stop the dev server, `rm -rf .next`, restart.

## What this is

An API-first virtual try-on and fit-recommendation service for UK apparel retail. A shopper supplies a photo
or measurements; they get a rendered image and a **recommended size with a confidence score and a reason**.
The size recommendation is the business case (fit is ~50% of apparel returns), the render is the wow-factor.

## Architecture

### The try-on provider seam

Everything above `lib/tryon/` is provider-agnostic. `getProvider()` resolves `TRYON_PROVIDER` against a
registry, defaulting to `mock` so a fresh clone runs offline with no keys. Adding a backend = implement
`TryOnProvider`, register it, add a disclosure record (below). Nothing else changes.

**`lib/tryon/mock.ts` is NOT virtual try-on.** It composites garment artwork at fixed coordinates — no body
detection, no segmentation, no pose warping. It returns `simulated: true`. This is the most likely thing for
a newcomer to misread. `lib/tryon/replicate.ts` is a non-functional worked example; its `garmentImageUrl`
throws by design.

### Disclosure is generated from code, not written alongside it

`lib/compliance/disclosure.ts` holds one `ProcessingDisclosure` per provider. `ConsentGate`, the render
label, and `/privacy` all render **from** those records.

- **Never hand-edit consent or privacy copy.** Change the disclosure record; the copy follows.
- `getDisclosure()` throws on an unregistered provider, which closes the photo path rather than asking for
  consent to something the app cannot describe. A test asserts every registered provider has a record.
- `app/page.tsx` and `app/privacy/page.tsx` are `force-dynamic`. Prerendering baked in the build machine's
  provider, so a deploy could show consent copy describing a provider that was not running.

### Garment images vs garment art

`Garment.art` is inline SVG for the picker thumbnail and the mock. **It is not a garment photograph**, and
every hosted try-on model needs one (`Garment.image`, `lib/garmentImage.ts`, gate G16).

`requireGarmentPhotograph` throws *before* a request is made, and `kind` is recorded rather than inferred
from the file extension. The reason is specific: a hosted model handed vector artwork does not error — it
returns a confident, useless render and bills for it. No garment in the catalogue has a photograph yet, and
a test asserts that, so the render path fails loudly rather than expensively.

Retailer product photography is copyrighted. Sourcing is a rights problem, not a code one.

### Two processing paths — do not conflate them

| | Photo leaves device |
|---|---|
| Measurement, `local` provider (`lib/pose/`, MediaPipe in-browser) | **No** |
| Try-on render (`POST /api/tryon`) | **Yes** |

A blanket "your photo never leaves your device" claim is true of the first and false of the second.

### The measurement seam

`lib/measure/` mirrors `lib/tryon/` for the measurement half. `MEASUREMENT_PROVIDER` selects it, default
`local`. Adding a provider = implement `MeasurementProvider`, register it, add a disclosure record.

- **`runsOn: "browser"` and "the photo stays on the device" are the same statement.** `lib/measure/client.ts`
  routes on exactly that: `local` runs in the browser, everything else goes to `POST /api/measure`, where
  credentials live. Do not let the routing and the privacy claim drift apart.
- `lib/measure/config.ts` holds *only* the provider name, with no provider imports — asking which provider
  is configured must not pull MediaPipe into a server component's graph.
- `heightCm` is mandatory for every provider including paid ones. A photo has no absolute scale; 3DLOOK asks
  for height too. Never infer or default it.
- `lib/measure/threedlook.ts` is a **worked example whose request mapping is unverified** and throws by
  design. Their API reference is behind an Enterprise agreement (gate G11). Do not guess field names — a
  wrong mapping mis-assigns measurements silently, and a confident wrong chest is worse than an error.
- Values carry `confidence: measured | estimated | unreliable`. `toBodyMeasurements()` drops `unreliable`
  ones so a number known to be wrong cannot move a size, while its note still reaches the UI.

### The fit engine

`lib/fit/recommend.ts` — weighted band matching (chest 0.6 / waist 0.25 / hip 0.15), fit preference applied
as ease *before* matching, asymptotic decay for out-of-range values in **absolute centimetres**. Makes no
network calls, so the business demo survives the render path being off.

Out-of-range scoring has produced the same bug twice: ranking far-out sizes by a *relative* measure lets a
wide or open-ended band beat a much nearer narrow one. Keep the decay absolute.

## Rules that exist because breaking them caused a real problem

- **Pose landmarks only — never facial features.** A face embedding would reclassify this as biometric data
  under UK GDPR and pull it into the Article 9 regime. `docs/03-compliance-uk.md` §1.
- **Size charts are body measurements, never garment measurements.** Garment figures include the maker's
  ease allowance, so matching a body against them silently oversizes everyone. Confirm against the
  retailer's own "how to measure" wording.
- **Real charts have gaps and open-ended bands.** Seasalt jumps 94→96cm at S/M. `outOfChartRange` tests the
  chart's overall span, not band membership.
- **Waist and hip are never estimated from a photo.** No landmark supports either. Hip looks like it should
  work — landmarks 23/24 are right there — but they are the hip *joint positions*, not the outer hip, and
  circumference is taken at the widest point over the buttocks. Estimating it shipped once and read ~30cm
  low; it was removed rather than retuned, because a bigger multiplier still measures the wrong thing.
  Recovering it needs image segmentation, not pose landmarks.
- **Verify UI changes in a real browser** (`claude-in-chrome`). Every real bug in this repo came from real
  data or a real browser; none came from unit tests.
- **Never commit anything under `assets/`** — real photos of people, gitignored, calibration input only.

### Honesty constraints — do not "fix" these

- Confidence caps at **0.95**; garment cut varies within a size (advertising-standards decision).
- `sizeChartVerified` and the photo-estimate bias caveat travel to the UI. Never suppress them.
- `simulated` and `aiGenerated` are **separate flags**. The mock composites artwork, so it is not
  AI-generated; labelling it so would be a false disclosure in the other direction.
- `processingRegion` stays `null` while gate G1 is open, and the UI says the location is unconfirmed. Set
  the region in `disclosure.ts` when G1 closes — do not edit copy.
- Consent gates the photo panel **only**. Measurements alone still produce a size; that alternative is what
  makes consent freely given rather than a toll gate.

## Gated work

`docs/04-prerequisite-gate.md` lists prerequisites that must be green before implementation. **Do not start
the Vertex provider until G1 (EU/UK region), G2 (price) and G3 (budget hard cap) are cleared** — all three
need the product owner's GCP console. Work not depending on a gate proceeds normally.

## Docs

`docs/06-build-playbook.md` — phases, goals, paste-ready prompts, cost control, memory scopes. Start here.
`docs/HANDOFF.md` — current state and blockers; **update it before stopping work.**
`01-landscape.md` build-vs-buy and licensing traps · `02-architecture.md` · `03-compliance-uk.md` ·
`04-prerequisite-gate.md` · `05-privacy-notice.md`.

Keep this file to stable rules. Status and next actions belong in `HANDOFF.md`, which is read on demand —
this one loads into every session.

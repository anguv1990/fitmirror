# FitMirror — Handoff

**Last updated:** 2026-08-31
**Status:** Everything buildable without a gate is done. The render path is blocked on you.
**Read this first.** It is the resume point if work is interrupted.
**Lost the thread entirely?** Read `06-build-playbook.md` instead — it starts from zero and tells you what
to type.

> **Where things stand.** Everything is on **`main`** (`0504d45`). PRs #1–#7 merged, no open PRs, no
> branches other than `main`. **101 tests**, typecheck, lint and build all clean.
>
> Done: the fit engine and `POST /api/fit`; client-side pose measurement; the compliance surface (G10);
> the measurement seam; the calibration harness (G8, two defects found and fixed); the size comparison;
> the garment image seam (G16 opened); and the hip estimate removed.
>
> **Nothing further can be built on the render path** until G1, G2 and G3 clear — all three need your GCP
> console. G16 needs licensed garment photography, which is a rights problem, not a code one.
>
> **If the demo were tomorrow, the fit half is the story and it is ready today**: a size, a reason, a
> confidence score and a two-size comparison, offline, at zero cost. See §5e for why that is the right
> pitch rather than a fallback.

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

Everything is on **`main`** (`0504d45`). No open branches, no open PRs. PRs #1–#7 all merged.

```
lib/fit/          recommendation engine, size charts, types      ← the hero
lib/pose/         MediaPipe landmarks → measurements, estimator
lib/tryon/        provider interface + mock (NOT real try-on)
lib/measure/      measurement seam: local (browser), 3dlook (stub)
lib/compliance/   per-provider processing facts; consent + label copy
lib/garmentImage.ts  garment photography resolution; fails before spending
app/api/fit/      POST recommendation, GET chart discovery
app/api/tryon/    POST render (mock provider only)
app/api/measure/  POST measurement, for providers that transmit
app/privacy/      the privacy one-pager
app/dev/pose/     dev harness for the pose path
app/dev/calibrate/  G8 calibration harness, browser-only
components/       Studio, ConsentGate, PhotoSource, MeasurementForm, GarmentPicker,
                  SizeRecommendation, SizeComparison, TryOnResult, PhotoMeasure
docs/             this handoff + landscape, architecture, compliance, gates,
                  privacy, playbook, 3DLOOK evaluation, 2026 VTON landscape
```

**Setup after clone:** `npm install`, then **`npm run setup:pose`** (vendors ~15MB of MediaPipe model +
WASM into a gitignored folder). Skipping the second step silently breaks photo measurement.

**Checks:** `npm test` (101), `npm run typecheck`, `npm run lint`, `npm run build` — all clean on `main`.

### Adding the Vertex renderer is one file

`lib/tryon/` already has the seam: `TryOnProvider` interface, env-driven resolver (`TRYON_PROVIDER`), and a
mock default. Adding Vertex = write `lib/tryon/vertex.ts`, register it in `lib/tryon/index.ts`. Nothing else
changes.

`lib/tryon/replicate.ts` is a **non-functional** worked example. It now throws via the shared
`requireGarmentPhotograph` rather than its own stub, because **no garment in the catalogue has a
photograph** (G16). That is the seam working, not a bug: a hosted model handed vector artwork returns a
confident, useless render and bills for it. Delete or replace the file when a real provider lands.

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
| G8 | **Bias calibration against real photos** | 🟡 Harness built, 2 defects fixed; needs tape measurements — §5c | Either |
| G9 | Pre-generate demo renders so the demo runs offline | Not started | Either |
| G10 | Consent copy, AI-generated label, privacy one-pager | ✅ **Cleared** — see §5b | Done |
| G16 | **Garment photography** — blocks every hosted renderer | 🟡 Seam built, images not sourced | You (rights) |
| G11–G15 | 3DLOOK gates: API pricing, residency, DPA, trial, Article 9 re-read | Open, only if buying — `07-…md` §7 | You |

**G1 and G2 are genuinely unresolved.** We could not confirm either from public documentation. Do not
assume EU availability or a price — both must be checked in the console before this architecture is
committed to. If G1 fails, the compliance story in `03-compliance-uk.md` changes materially.

**G6 changes the legal position.** Synthetic-only (D2) needs no DPIA. Audience upload does.

---

## 5. Pick up here

### Blocked on you — the render path cannot move without these

1. **G1** — is `virtual-try-on-001` available in an EU/UK region? Console lookup, minutes.
2. **G2** — exact per-image price.
3. **G3** — budget alert + hard cap, **before the first API call**.
4. **G6** — audience uploads at the demo? Yes ⇒ a DPIA is required *first*, and it is days of work.
5. **G16** — licensed garment photography. A rights problem, not a code one; the seam is built and waiting.

**G1 and G2 have now survived two attempts to resolve them from public documentation.** Treat them as
console-only facts and stop searching for them.

### Buildable without a gate, in rough value order

**All of this is now tracked as GitHub issues** (`anguv1990/fitmirror`), labelled `ready-for-agent` where
it is fully specified and safe to hand to an AFK agent, and `ready-for-human` where it needs a tape
measure, a physical device or people. See `docs/agents/issue-tracker.md` for the conventions.

6. **G9 — demo resilience.** ~~#12~~ **done** — the fit path makes no external request at all; see §5g.
   Pre-generating *Vertex* renders stays blocked on G1–G3. One manual step is left: turn the wifi off
   and walk the demo once.
7. **Hip, properly** — #17. Recovering it needs a body outline via MediaPipe Image Segmenter, not pose
   landmarks. With a side photo it also gives depth, so circumference becomes an ellipse approximation
   rather than a population multiplier — which would improve chest too. Real work, not a constant change.
8. **G8 ground truth** — #10 (tape measurements plus a confirmed height, to quantify the chest error) and
   #11 (widen to 8 distinct people). The harness is built and waiting. **No multiplier moves until both
   are done**: six photos of one person is one observation repeated, and the documented bias varies by sex.
9. ~~**Trim the production surface** — #14.~~ **Done.** `/dev/pose` and `/dev/calibrate` are excluded
   from the production build by extension rather than by a runtime guard, so the code is never compiled —
   see §5f. `lib/tryon/replicate.ts` was deliberately *not* in that issue: it goes when a real provider
   lands, which makes it downstream of G1–G3 rather than unblocked work.
10. **Mobile layout** — #13. Still inspection-only; needs a real device before the demo.
11. ~~**Fit polish** — #15.~~ **Done.** Size charts now declare an `audience`, and an impossible
    garment/chart pairing suppresses the size instead of returning a confident one — see §5h. Selecting
    a chart *from* the garment is deliberately not built: it needs an audience on `Garment`, which is a
    product decision about whether the catalogue models gendered garments. **Open question for you.**

**Do not start** the Vertex provider until G1–G3 are green. That is the whole point of the gate.

## 5h. Size charts have an audience, and impossible pairings suppress the size (#15)

`SizeChart` now carries `audience: "womens" | "mens"`, taken from each retailer's own page — the same
standard as `verified`, not inferred. The picker shows it, so "Women's — Boden UK…" rather than a brand
name that does not say who it sizes.

**The bug this fixes was live:** a shopper could select the Rust Midi Dress against Seasalt menswear and
get a confident **M at 85%**. Nothing connected the garment to the chart.

**Suppressed, not captioned.** On an impossible pairing the size is withheld and the reason shown in its
place, following the rule already applied to `unreliable` measurements: a number known to be meaningless
must not reach the shopper, while the explanation still does.

**The guard is deliberately narrow** — only `dress` against a menswear chart, which is an absence in the
source rather than a judgement. Both charts carry tops, so a `top` says nothing about which chart applies,
and guessing would be worse than silence. Same reasoning that removed the hip estimate rather than
retuning it. Verified in a browser that a top on the menswear chart still returns M at 85%; over-blocking
would be the more damaging failure.

`lib/chartMatch.ts` sits at the lib root, not in `lib/fit/`, because the fit engine does not import the
garment catalogue and keeping it that way is what lets a recommendation run with no product context.

**Not built, and it needs your decision:** selecting the chart *from* the garment requires `audience` on
`Garment`. The catalogue art is audience-neutral, and asserting the oatmeal tee is womenswear is a claim
about the product, not a refactor.

---

## 5g. The demo makes no external request (G9, #12)

Traced against a **production** build in a real browser, because that is what runs at the venue: the page
load is **17 requests, every one to the app's own origin**, and `POST /api/fit` returned UK 14 at 81%
confidence among them. On the default `mock` + `local` configuration nothing outbound happens at all.

Three things that would each have broken this quietly, all checked:

- **Fonts.** `next/font/google` reads as a network dependency but downloads at *build* time and vendors
  the files — 25 `.woff2` shipped, no `googleapis`/`gstatic` reference in the output. **The asymmetry
  matters: the build needs network, the running app does not.** Do not plan to rebuild at the venue.
- **MediaPipe.** `lib/pose/estimator.ts` points at `/mediapipe/…`, root-relative and therefore
  same-origin by construction — it cannot silently become a CDN fetch. Both assets confirmed served
  locally. This is what `npm run setup:pose` is for.
- **The default providers.** The only external `fetch` in the tree is `lib/tryon/replicate.ts`, which is
  not the default.

**Locked in by `lib/offline.test.ts`**, which traps `globalThis.fetch` and asserts the defaults resolve
to `mock` / `local` and call nothing. The real risk it guards is a changed default: a paid provider
reached by a fresh clone bills on first page load, and it looks fine on the developer's machine.

**Not yet done, and it is a human step:** actually disabling wifi and walking the demo. What is proven is
that the app *makes no external request* — the mechanism behind running offline, not a substitute for
having watched it.

---

## 5f. Dev harnesses are excluded by extension, not by a guard (#14)

`app/dev/pose` and `app/dev/calibrate` are named `page.dev.tsx`. `next.config.ts` includes `dev.tsx` in
`pageExtensions` **only when `NODE_ENV === "development"`**, and Next resolves pages by globbing
`page.{ext}`, so in a production build the file is never matched and never compiled.

**Why not a `notFound()` guard.** A guard leaves the route present and the code in the bundle — the
calibration harness is 372 lines that accept photo uploads, and "unreachable" is a weaker claim than "not
shipped". Verified after the change: the production route list is `/`, `/_not-found`, `/api/fit`,
`/api/measure`, `/api/tryon`, `/privacy`, and `SHOULDER_TO_CHEST_CIRCUMFERENCE`, `CALIBRATED_KEYS` and
`suggestedMultiplier` appear nowhere under `.next/`.

**The consequence to remember:** the harnesses exist under `npm run dev` and nowhere else. Both were
checked in a real browser after the change — `/dev/pose` renders and `/dev/calibrate` runs, exports and
still reports the live multipliers. If you ever need one against a production build, that is now a
deliberate config change, not an accident.

---

## 5e. The strategic position — read before writing the demo script

**Google shut down its standalone Doppl app on 30 April 2026 and moved virtual try-on into Google Search
and Shopping — US, UK and India.** Shoppers upload one photo and see themselves in billions of listings,
free. Zalando, Zara and L'Agence are running campaigns on it.

**The render is commoditised, in our market, now.** Decision D1 — fit recommendation as the hero — has
aged well, and this is the evidence rather than a rationalisation. Anything pitched as "we show the garment
on your body" competes with the search box at a price of zero.

**What Google does not do is tell you which size to order.** That is what `components/SizeComparison.tsx`
answers — the recommended size against the next-best one, band by band, attacking bracketing directly. It
is deliberately *not* two renders: no commercially available model varies its output by size, so two
identical images captioned with different sizes would be a false visual claim, and the panel says so.

It is also what the 2026 fit-aware research thread (FitVTON, FitControler, the FIT dataset) has now
identified as the open problem. FitVTON controls fit through 16 body-size prototypes and states it cannot
express continuous measurements or centimetre-level ease — which is exactly what `lib/fit/recommend.ts`
already does.

**So say it out loud in the demo:** Google gives the picture away; we do the part it does not. That is a
stronger position than implying the render is the product. Full detail in `08-vton-2026-and-next.md`.

---

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

**Hip — now fixed by removal (2026-08-31).** Estimates came out at **72.1cm and 66.7cm** against chests
near 100cm. The cause was structural: `HIP_WIDTH_TO_CIRCUMFERENCE` was applied to MediaPipe's hip **joint
positions** (~23cm apart), not the outer hip (~35cm). Shoulder resolved to ~40.9cm and was correct, so the
scale was never the problem — the landmark was.

**Removed rather than retuned.** Scaling to ~4.3 makes the number look right while still measuring the
wrong thing, and with no tape measurements it would be fitting the symptom to an assumption. This is the
same rule that already covered waist — *no landmark supports it* — applied to the case that was missed.
Shoppers can still type a hip. Recovering the estimate needs **image segmentation** for a body outline, not
pose landmarks; `CALIBRATED_KEYS` keeps `hipCm` so the harness can validate that when it exists.

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
| `../ONBOARDING.md` | Team onboarding guide (repo root). |
| `agents/*.md` | Agent-skill config: issue tracker, triage labels, domain-doc rules. |

---

## 7. Explicit non-goals for the MVP

No checkout, no payments, no user accounts, no persistence of shopper photos beyond a single request,
no mobile app, no multi-brand catalogue, no production SLA. Footwear and tailoring are out — see
`02-architecture.md` for why one garment category is the right call at this timeline.

---

## 8. Loose ends

- **`ONBOARDING.md` stats go stale.** It is committed and complete, but its usage figures are a snapshot.
  Re-run `/team-onboarding` when the project moves on.
- **`lib/tryon/replicate.ts` is dead weight.** Non-functional by design; delete or replace when a real
  provider lands.
- ~~**`app/dev/pose` and `app/dev/calibrate` ship in the production build**~~ — **closed by #14**, see
  §5f. Both still work under `npm run dev`, which G8 still needs.
- **`assets/` holds real photos of people**, gitignored, calibration input for G8 only. Never commit them.
- **Two `postcss` advisories** via Next 15, build-time CSS processing only. Fix requires Next 16, a major
  upgrade. **Deliberately left alone — no issue filed**, so that the decision is not quietly reopened by
  someone working the tracker.
- **Mobile layout is unverified** — **#13**. The browser tooling could not emulate a viewport; responsive
  behaviour is inspection-only. Worth a real device check before the demo.

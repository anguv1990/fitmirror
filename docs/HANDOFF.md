# FitMirror — Handoff

**Last updated:** 2026-08-29
**Status:** Fit engine built on `feat/fit-engine`. Render path still gated.
**Read this first.** It is the resume point if work is interrupted.

> **Progress.** Build items 1–2 from `02-architecture.md` §8 are done — the fit recommendation engine and
> `POST /api/fit`, with 22 passing tests. They were built ahead of the P0 gates because they depend on
> none of them: no API key, no cloud project, no per-call cost. Items 3 and 5 remain blocked on
> G1/G2/G3/G7 and G6. **Item 4 (MediaPipe pose) is unblocked and is the next thing to build.**

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

The existing FitMirror scaffold (PR #1, branch `scaffold-virtual-tryon`) is **directly reusable as the
demo front-end and API skeleton**. It already contains the exact seam this project needs:

- `lib/tryon/types.ts` — `TryOnProvider` interface
- `lib/tryon/index.ts` — env-driven provider resolver (`TRYON_PROVIDER`)
- `lib/tryon/mock.ts` — offline placeholder (**does not do real try-on**; overlays art at fixed coordinates)
- `app/api/tryon/route.ts` — validated POST endpoint, correct error codes

**Adding Vertex AI = writing one new provider (`lib/tryon/vertex.ts`) and registering it.** Nothing else
in the app has to change. The fit-recommendation engine is new and additive.

`lib/tryon/replicate.ts` is a non-functional worked example and should be **deleted or replaced** — it was
illustrative only.

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
| G5 | Source a real brand **size chart** with body measurements | 🟡 Womenswear done (Boden); menswear outstanding | You |
| G6 | Decide: does the live demo allow **audience uploads**? | Open | You |

**G1 and G2 are genuinely unresolved.** We could not confirm either from public documentation. Do not
assume EU availability or a price — both must be checked in the console before this architecture is
committed to. If G1 fails, the compliance story in `03-compliance-uk.md` changes materially.

**G6 changes the legal position.** Synthetic-only (D2) needs no DPIA. Audience upload does.

---

## 5. Recommended next actions

**Yours (nobody else can do these — they need your GCP account):**

1. Clear **G1 and G2** in the GCP console. Everything on the render path depends on them.
2. Set the budget cap (**G3**) before making a single API call.
3. Decide **G6** (audience uploads). It determines whether a DPIA is needed.
4. Source a real **menswear** chart to finish **G5**. Womenswear is done — Boden UK's published body
   measurements are in and are the demo default. Menswear is still a flagged placeholder.

**Buildable now, gate-independent:**

5. Item 4: MediaPipe pose → estimated measurements, client-side. Apache 2.0, free, and because it runs
   in the browser the fit path never transmits the photo at all.
6. UI for the fit flow, wired to `POST /api/fit`.

## 5a. What was built, and what it deliberately does not do

`feat/fit-engine` adds `lib/fit/` and `app/api/fit/route.ts`:

- Weighted band matching (chest 0.6 / waist 0.25 / hip 0.15) against a size chart
- Fit preference (`fitted` / `regular` / `relaxed`) applied as ease before matching
- Confidence scoring that drops on boundaries, measurement disagreement, single measurements,
  photo-derived input, off-chart bodies, and unverified charts
- Plain-English explanation — the reason string is the product, not decoration
- **Confidence is capped at 0.95.** It never claims certainty, because garment cut varies within a size
  regardless of how well measurements match (`03-compliance-uk.md` §5)
- **Placeholder charts are flagged in every response** via `sizeChartVerified: false`

Three defects were found and fixed during verification, all worth knowing about because they are the
failure modes this engine will drift back toward:

1. Far-out measurements all scored exactly 0 under a linear decay, so a 150cm chest was recommended
   **XS** — the first entry, not the nearest. Now decays asymptotically.
2. Confidence could reach 1.0.
3. With a fit preference applied, the explanation quoted the raw measurement against the eased band
   ("96.5cm is toward the upper end of 91–96cm") — self-contradictory. Now shows both figures.

---

## 6. Document map

| File | What it covers |
|---|---|
| `HANDOFF.md` | This file. State, decisions, blockers, next actions. |
| `01-landscape.md` | Market analysis, build-vs-buy, licensing traps, cost comparison |
| `02-architecture.md` | Enterprise MVP architecture, API design, cost controls |
| `03-compliance-uk.md` | UK GDPR position, DPIA trigger, security controls, AI transparency |
| `04-prerequisite-gate.md` | The checklist that must be green before coding |

---

## 7. Explicit non-goals for the MVP

No checkout, no payments, no user accounts, no persistence of shopper photos beyond a single request,
no mobile app, no multi-brand catalogue, no production SLA. Footwear and tailoring are out — see
`02-architecture.md` for why one garment category is the right call at this timeline.

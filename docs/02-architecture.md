# 02 — MVP Architecture, Infrastructure and Cost Control

> Tech stack is **not** finalised here — that is deliberate, per the brief. This document defines the
> *shape*: components, contracts, boundaries and cost controls. Language/framework choices are recorded
> in §7 as a recommendation to be confirmed once the prerequisite gate is green.

## 1. Design principles

1. **Two independent paths, one front door.** Try-on render and fit recommendation must be separately
   callable. If the render fails or is rate-limited, the fit recommendation still returns. This is not
   just resilience — it is what lets us demo the business case when the GPU-backed call is slow on
   conference wifi.
2. **The photo is radioactive.** It enters, it is used, it is destroyed. Never written to durable storage,
   never logged, never in a URL. See `03-compliance-uk.md`.
3. **Every generated image is labelled.** AI-generated output is disclosed in the response payload and in
   the UI, not just in the C2PA metadata.
4. **Cost is a first-class input, not a post-hoc surprise.** Every path that costs money is gated,
   cached, and capped.

## 2. Component view

```
                    ┌──────────────────────────────────────┐
   Shopper ────────▶│  Next.js app (existing FitMirror)    │
                    │  consent gate → photo OR measurements │
                    └──────────────┬───────────────────────┘
                                   │  (photo never leaves as a URL)
                    ┌──────────────▼───────────────────────┐
                    │        API layer  /api/*             │
                    │  validation · rate limit · audit log  │
                    └────┬────────────────────────┬─────────┘
                         │                        │
          ┌──────────────▼─────────┐   ┌──────────▼────────────────┐
          │  FIT ENGINE (ours)     │   │  RENDER (Vertex VTON)     │
          │  MediaPipe landmarks   │   │  virtual-try-on-001       │
          │  + declared height     │   │  base64 in / image out    │
          │  → measurements        │   │  C2PA + SynthID applied   │
          │  → size chart match    │   └──────────┬────────────────┘
          │  → size + confidence   │              │
          │  + WHY (explainable)   │              │
          └──────────────┬─────────┘              │
                         │                        │
                    ┌────▼────────────────────────▼─────────┐
                    │  Response: size, confidence, reason,  │
                    │  rendered image, ai_generated: true   │
                    └───────────────────────────────────────┘
```

**Reuse note.** The existing scaffold already provides the API layer, validation, error taxonomy
(400/501/502) and the `TryOnProvider` seam. The render box above is a new `lib/tryon/vertex.ts`
implementing the existing interface. The fit engine is genuinely new.

## 3. API contract (draft)

Two endpoints, deliberately separable.

### `POST /api/fit` — the hero

```jsonc
// request — measurements path
{
  "heightCm": 178,
  "measurements": { "chestCm": 98, "waistCm": 84, "hipCm": 100 },
  "productId": "sku-1234"
}

// request — photo path (heightCm REQUIRED: a photo has no absolute scale)
{
  "heightCm": 178,
  "personImage": "data:image/jpeg;base64,...",
  "productId": "sku-1234"
}

// response
{
  "recommendedSize": "M",
  "confidence": 0.82,
  "reason": "Your chest (98cm) sits mid-range for M (94-102cm). Your waist is near the M/L boundary — size up if you prefer a looser fit.",
  "alternativeSize": "L",
  "measurementSource": "estimated_from_photo",   // or "declared"
  "estimateCaveat": "Photo-based estimates are approximate and tend to under-read width."
}
```

`reason` is not decoration. An unexplained size recommendation is not trusted and not adopted — the
explanation *is* the product.

### `POST /api/tryon` — already exists, gains a real provider

Extend the existing contract with `aiGenerated: true` and a provenance field. The current
`simulated: true` honesty flag becomes `provider: "vertex"` with `simulated` absent.

## 4. Infrastructure

Deliberately minimal — a hackathon MVP that pretends to be a platform fails at both.

| Concern | MVP choice | Why not more |
|---|---|---|
| Compute | Single container (Cloud Run) or local for demo | Autoscaling adds cost + cold-start risk on stage |
| Region | **EU/UK region — pending G1** | Data residency. If G1 fails, see `03-compliance-uk.md` §6 |
| Storage | **None for shopper data.** Static assets only | Nothing to breach, nothing to retain |
| Secrets | Secret Manager (or `.env.local`, never committed) | Keys in git is the classic hackathon incident |
| Catalogue | Hardcoded module, ~6–10 SKUs | A DB earns nothing at this scale |
| Auth | None (public demo) — **but rate-limited** | Cost protection, not security |
| Observability | Structured logs, **no image data, no PII** | See §6 |

**Cloud Run over GKE, deliberately.** Scale-to-zero means idle cost is zero between demo runs.

## 5. Cost control — the part that usually gets skipped

The brief was explicit about not overspending. Layered defence:

| Layer | Control | Effect |
|---|---|---|
| 1 | **GCP budget alert + hard cap** on the project | Absolute ceiling. Set this *before* the first API call. |
| 2 | **Pre-generate all demo renders** for the scripted path | The on-stage happy path costs £0 and cannot fail live |
| 3 | **Cache by hash** `(personImageHash + productId)` | Repeat demos and judge re-tries are free |
| 4 | **Per-session cap** (e.g. 5 renders/session) | Bounds audience-upload blast radius |
| 5 | **Fit engine never calls a paid API** | The business-case demo has zero marginal cost |
| 6 | Vertex quota is 50 req/min/region | Natural throttle; design for it rather than fight it |

**Layer 2 is the highest-value item in this document.** Live GPU inference during a judged demo, over
venue wifi, is an unforced error. Pre-render the scripted flow; keep live inference as the "and it works
on *your* photo too" encore.

**Cost estimate — cannot be completed.** Vertex VTON per-image pricing is gate **G2** and remains
unverified. For scale, using FASHN's published ~$0.075 as a *proxy only*: 500 demo renders ≈ $37.
Real figure pending G2. **Do not treat the proxy as a budget.**

## 6. Security posture

- **No shopper image on disk, ever.** Process in memory, respond, discard. Not "delete after 24h" —
  never written.
- **No images or measurements in logs**, including error paths. Log an opaque request ID only.
- **No personal data in URLs or query strings** (they land in access logs and browser history).
- Base64 in the request body, not GCS upload — fewer places the data can rest.
- Secrets via Secret Manager; least-privilege service account (Vertex predict only, no storage write).
- Rate limiting on both endpoints, by IP and by session.
- Dependency scanning in CI before the public demo.

## 7. Tech stack recommendation (to confirm after the gate)

Recommended, not decided:

- **Front-end / API:** the existing Next.js 15 + TypeScript app. It already has the provider seam,
  validation and error handling. Rebuilding this would be waste.
- **Fit engine:** TypeScript alongside the API for MVP simplicity. Move to Python only if the
  measurement maths outgrows it — it likely will not at this scope.
- **Pose:** MediaPipe Pose (Apache 2.0), **client-side in the browser**. This is a compliance win as much
  as a performance one: landmarks are extracted on the shopper's device and only *derived numbers* reach
  our server. The photo need never be transmitted for the fit path at all.

That last point is worth stating plainly: **running pose detection client-side means the fit
recommendation path can work without the photo ever leaving the shopper's device.** That is a genuinely
strong privacy story and it is nearly free to implement. It only applies to the fit path — the render path
must transmit the image.

## 8. Scope discipline for a 1–2 week build

**One garment category: upper-body tops.** Not a limitation to apologise for — it is the category where
the open-source and commercial models both perform best (lower-body support is patchy; OOTDiffusion does
not support it at all), and where size charts are simplest. Footwear and tailoring are different problems.

Ship, in order:
1. Fit engine with **declared measurements** (no ML, always works — this is the safety net)
2. Size chart + explainable recommendation
3. Vertex render on pre-selected demo photos
4. Photo → MediaPipe → estimated measurements
5. Live upload, only if G6 is resolved and the DPIA is done

**Items 1–3 constitute a complete, demoable product.** If time runs out at item 3, the demo is still
coherent and still makes the business argument. Items 4–5 are upside.

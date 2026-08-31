# 08 — Virtual Try-On in 2026, and Where It Goes Next

Update to `01-landscape.md`, which was written earlier in this project's life. Retrieved 2026-08-31.

Sections 1–3 are sourced and cited. **Section 5 is forecasting — my analysis, not fact**, and is labelled
as such throughout.

---

## 1. The headline: the render is being commoditised, in our market, right now

**On 30 April 2026 Google shut down its standalone Doppl app and moved virtual try-on into Google Search
and Google Shopping.** Shoppers in the **US, UK and India** upload one photo and see themselves in billions
of garment listings, powered by a fashion-specific model that reasons about how fabrics fold, stretch and
drape across different bodies. Shoe try-on followed, with expansion to Australia, Japan and Canada
announced. L'Agence, Zalando and Zara are running try-on campaigns with Google.

**Read that against our own decision record.** `01-landscape.md` treated the render as the wow-factor and
the fit recommendation as the business case, and D1 made fit the hero. That call has aged well, and this is
the evidence: **the wow-factor is now a free feature inside the search box, in the UK, for the whole
catalogue.** Anything whose pitch is "we show you the garment on your body" is now competing with Google
Search at a price of zero.

The market is still growing — ~$5.1bn in 2026, projected to $14.2bn by 2033 at 15.8% CAGR — but the growth
is in the layer above the pixels, not the pixels.

---

## 2. Where the research frontier actually is

2D diffusion inpainting — the IDM-VTON / CatVTON generation this project surveyed — is now the *settled*
part. The live problems in 2026 are elsewhere:

### Fit-aware try-on — the one that matters to us

An explicit 2026 research thread has formed around the exact gap this product was built on:
**FitVTON** (June 2026), **FitControler**, and **FIT**, a large-scale fit-aware dataset.

Their framing is worth quoting because it is our thesis, arriving in the literature: most methods
*"treat the task as 2D inpainting, prioritizing texture preservation over physical plausibility"*, and so
*"produce plausible-looking images that fail to reflect authentic garment fit across diverse body shapes."*

FitVTON conditions on garment-body size through structured prompts, adds mask heads for garment and exposed
body, and evaluates on a curated `FittingEffect3K` set.

**Its stated limitation is the opening.** Control comes from **16 representative body-size prototypes**, and
the authors note it *cannot specify continuous body measurements, garment dimensions, or centimetre-level
ease*. Our fit engine works in absolute centimetres and applies ease before matching. The state of the art
in fit-aware *rendering* is coarser than our fit-aware *recommendation* — and the two are complementary
rather than competing.

### The other active threads

| Thread | What it is | Relevance to us |
|---|---|---|
| **Video try-on** — ViViD, RealVVT, iTryOn (ICML 2026), TCE-VTON | Temporal consistency across frames | High production value, high cost. Not MVP. |
| **Camera-controllable / 4D** — TryOnCrafter, CaM-VVT | Renderable 4D proxy, free camera trajectory | Where "walk around yourself" comes from. Watch. |
| **Multi-layer garments** — GO-MLVTON | Layering with correct occlusion and drape | Matters for outfits, not single garments. |
| **Virtual try-*off*** — TryOffDiff, Dual-UNet (ICPR 2026) | Inverse problem: reconstruct the flat garment from a worn photo | **Quietly strategic — see below.** |

**Try-off deserves attention.** It reconstructs a canonical garment image from a photo of someone wearing
it. That solves a real operational problem we already hit: `lib/tryon/replicate.ts` is non-functional partly
because our catalogue stores garments as inline SVG, while hosted try-on models expect clean product
photography. Try-off is how a retailer turns messy real-world imagery into try-on-ready assets at scale.

---

## 3. Vertex, and our open gates

`virtual-try-on-001` is now **generally available**, replacing the `virtual-try-on-preview-08-04` endpoint
our docs referenced.

**Gates G1 and G2 remain genuinely open.** Published examples still use `us-central1`, and no comprehensive
region list or per-image price surfaced in this search either. That is now the second independent attempt
to establish these from public sources without success — which is itself informative: **treat them as
console-only facts and stop trying to resolve them from documentation.**

---

## 4. What this changes for FitMirror

1. **The strategy is validated, and the emphasis should harden.** Fit recommendation was already the hero.
   Google shipping free try-on into UK Search makes that the *only* defensible position, not merely the
   better one.
2. **"We render garments on people" is no longer a pitch.** "We tell you which size to order, in
   centimetres, with a reason" still is — and the 2026 literature now agrees it is the unsolved half.
3. **The demo narrative should say this out loud.** Acknowledging that Google gives the picture away free,
   and that we are attacking the part it does not solve, is a stronger position than pretending the render
   is the product.
4. **Nothing about the architecture needs to change.** The `TryOnProvider` and `MeasurementProvider` seams
   already make the render a swappable, non-load-bearing component. That was the right shape.
5. **Watch FitVTON's prototype limitation.** If fit-aware renderers move from 16 prototypes to continuous
   measurements, the render and the recommendation converge — and the interesting product becomes the one
   holding the measurements. That is us.

---

## 5. Where this goes next — **forecast, not fact**

Clearly labelled as judgement. Treat as a hypothesis to test, not a finding.

**Near term (12 months). The render becomes plumbing.** Between Google in Search and commodity APIs, image
generation stops being a differentiator and becomes a line item. Value moves to whoever holds the body
measurements and the size decision. Expect fit-aware conditioning — continuous measurements rather than
prototypes — to be the visible research direction, because that is the stated open problem.

**Medium term (1–3 years). The persistent body profile.** The scarce asset is a reusable, consented,
portable body model — measured once, used across retailers. Whoever holds it owns the relationship, and it
is a genuinely hard privacy and regulatory position rather than a purely technical one. The winners will be
the ones who can hold it *lawfully* and prove it. **This is where an architecture that stores nothing
becomes a strategic asset rather than a limitation** — the constraint we adopted for compliance reasons is
plausibly a moat.

**Longer term. Fit prediction detaches from imagery entirely.** The end state is not a better picture; it is
"this will be tight across your shoulders and long in the sleeve", derived from your measurements and this
garment's actual pattern. The render becomes the explanation, not the answer. Garment-side data — real
pattern and grading data rather than published size charts — becomes the bottleneck, and it is a commercial
and relationship problem, not a modelling one.

**The forecast I would bet against:** that generative fidelity keeps being the axis of competition. It has
already stopped being scarce.

---

## 6. Actions

- [ ] **Retire "the render is the wow-factor" from the demo narrative.** Replace with the honest framing:
      Google gives the picture away; we do the part it does not.
- [ ] **Stop trying to resolve G1/G2 from public docs.** Two failed attempts. Console only.
- [ ] **Read FitVTON properly** before any fit-engine rework — its prompt-conditioning approach and its
      prototype limitation are directly adjacent to `lib/fit/recommend.ts`.
- [ ] **Note try-off as the answer to the garment-asset problem** blocking a real provider, recorded against
      the `garmentImageUrl` stub in `lib/tryon/replicate.ts`.
- [ ] Re-check licensing before adopting *any* 2026 model. Two for two so far — IDM-VTON/CatVTON
      (CC BY-NC-SA) and SMPL/SMPL-X (non-commercial). Assume research-only until proven otherwise.

---

## Sources

- [Google, DressX and the new fashion AI virtual try-on stack — Forbes, Apr 2026](https://www.forbes.com/sites/moinroberts-islam/2026/04/14/google-dressx-and-the-new-fashion-ai-virtual-try-on-stack/)
- [Google Virtual Try-On is now in Search: what every retailer must know in 2026](https://adrianarivas.tech/2026/04/18/google-virtual-try-on-retail-2026/)
- [Google expands virtual try-on to shoes — Yahoo Tech](https://tech.yahoo.com/ai/gemini/articles/google-expands-virtual-try-shoes-105100275.html)
- [FitVTON: Fit-aware Virtual Try-On via Body-Garment Size Control](https://arxiv.org/abs/2606.12012)
- [FitControler: Toward Fit-Aware Virtual Try-On](https://arxiv.org/abs/2512.24016)
- [FIT: A Large-Scale Dataset for Fit-Aware Virtual Try-On](https://huggingface.co/papers/2604.08526)
- [What Matters in Virtual Try-Off? Dual-UNet Diffusion, ICPR 2026](https://arxiv.org/abs/2604.08716)
- [GO-MLVTON: Garment Occlusion-Aware Multi-Layer Virtual Try-On](https://arxiv.org/html/2601.13524v3)
- [TryOnCrafter: camera trajectories via a renderable 4D try-on proxy](https://arxiv.org/abs/2606.26092v1)
- [iTryOn: Interactive Video Virtual Try-On, ICML 2026](https://arxiv.org/pdf/2605.21431)
- [Awesome-Try-On-Models](https://github.com/Zheng-Chong/Awesome-Try-On-Models)
- [Virtual Try-On AI market forecast to 2033](https://www.openpr.com/news/4617176/virtual-try-on-ai-market-size-share-and-forecast-to-reach)

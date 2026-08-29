# 01 — Market Landscape and Build-vs-Buy

## 1. The market splits in two, and conflating them is the classic mistake

| | **Visualisation (VTON)** | **Fit / size recommendation** |
|---|---|---|
| Question answered | "What does it *look* like on me?" | "What size should I *order*?" |
| Drives | Conversion, engagement, social sharing | **Return-rate reduction** |
| Typical tech | Diffusion image models | Body measurement + size-chart matching + purchase history |
| Players | Google VTON, FASHN, Zyler, Revery, Doji | True Fit, Fit Analytics (Bonprix/Snap), 3DLOOK, Bold Metrics, Sizer |
| Cost profile | Per-image GPU inference — **expensive** | Mostly arithmetic — **near-free at MVP scale** |

**Implication for us.** The stated business goal is reducing returns from size mismatch. That is served by
the *right-hand column*. The left-hand column is what wins the room at a hackathon. We are building both
(decision D1), but they are separate subsystems sharing a front door — not one feature. Budget and effort
should not be split evenly: the render is one API call, the fit engine is where the defensible logic lives.

## 2. Open-source try-on: capable, and commercially unusable

This is the single most important finding of the analysis.

| Model | Licence | Commercial use | Notes |
|---|---|---|---|
| **IDM-VTON** | CC BY-NC-SA 4.0 | ❌ **Prohibited** | Best garment fidelity; heavy pipeline; auto-masking reliable on tops only |
| **CatVTON** | CC BY-NC-SA 4.0 | ❌ **Prohibited** | Lightweight (899M params, 49M trainable), runs <8GB VRAM, ~35s/image |
| **OOTDiffusion** | Check before use | ⚠️ Verify | Dual-UNet; **lower-body garments unsupported** |
| **StableVITON** | Check before use | ⚠️ Verify | Historically important; output quality now behind the others |

Three traps stacked on top of each other:

1. **NC licence.** CC BY-NC-SA 4.0 bars commercial use outright. A retail product is commercial.
2. **ShareAlike.** The SA term is copyleft — derivative works inherit the licence. Fine-tuning does not
   escape it.
3. **Training-data licences.** These models are trained on VITON-HD and DressCode, which carry their own
   research-only terms. Even a permissively licensed model trained on them can inherit a problem.

**Conclusion.** Open source is viable for *local experimentation only*, and even then the output must not
appear in a commercial demo reel or investor deck. It is not a cost-saving path to a product. This directly
answers the "can we save cost with open source?" question: **for the try-on renderer, no.**

**The exception — and it is a big one.** For the *fit engine*, open source is entirely clean:
**MediaPipe Pose is Apache 2.0**, commercially usable, and gives the body landmarks we need. So the answer
is nuanced: buy the renderer, build the recommender.

## 3. Managed try-on options

| Option | Price/image | Commercial licence | Data residency | Notes |
|---|---|---|---|---|
| **Google Vertex AI VTON** (`virtual-try-on-001`) | ❓ **Not published where we could reach it — VERIFY** | ✅ Yes | ❓ **VERIFY EU region** | GA. C2PA + SynthID watermarking. Quota 50 req/min/region. ≤10MB PNG/JPEG, ≤4 outputs/request. Accepts base64 or GCS URI. |
| **FASHN.ai** | ~$0.075, →<$0.04 at volume | ✅ Yes | ⚠️ Not guaranteed | API-first. Default output 576×864 — lower res than rivals. |
| **PixelAPI** | ~$0.012 (claimed) | ⚠️ Verify | ⚠️ Unknown | Cheapest claimed; least established. Diligence before trusting. |
| Self-host CatVTON | GPU cost only | ❌ **No** | ✅ Full control | Licence blocks product use. |

**Why Vertex wins for this MVP** (decision D3), assuming G1/G2 clear:

- **Licensing is clean** — no NC restriction, no copyleft.
- **C2PA Content Credentials + SynthID watermarking are built in.** This is a compliance *asset*: AI-content
  transparency obligations get satisfied by the vendor rather than by us.
- **No GPU infrastructure**, which at a 1–2 week timeline is decisive.
- Likely EU regions for data residency — **but this is exactly gate G1 and is not yet confirmed.**

**The honest caveat:** we could not confirm Vertex VTON's per-image price or EU availability from public
docs. If G2 comes back materially more expensive than FASHN's ~$0.04–0.075, revisit. If G1 comes back
US-only, the UK data-residency story weakens and FASHN's disadvantage narrows.

## 4. Fit recommendation: how the incumbents do it

Three approaches, in increasing order of accuracy and cost:

1. **Declared measurements → size chart.** User enters height, weight, chest/waist/hip. Match against the
   brand's chart. Trivial to build, surprisingly effective, zero ML risk. **This is our baseline and it
   should not be skipped.**
2. **Photo → pose landmarks → estimated measurements → size chart.** MediaPipe Pose extracts landmarks;
   geometry estimates circumferences. Literature reports ~90% size-estimation accuracy — with a documented
   bias: **captured outlines underestimate widths more than depths, particularly for female subjects.**
   That bias is a fairness issue and must be disclosed, not buried (see `03-compliance-uk.md`).
3. **Purchase + return history (True Fit / Fit Analytics model).** Learns from what a shopper kept versus
   returned, across brands. Most accurate in production, needs data we do not have. **Out of scope.**

**Critical technical constraint on approach 2:** a single photo has **no absolute scale**. Pixel landmarks
cannot become centimetres without a reference — user-declared height, or a known object in frame. Any design
that promises measurements from a bare photo with no scale reference is wrong. Plan for declared height as
a required input.

## 5. Recommended posture

| Component | Decision | Rationale |
|---|---|---|
| Try-on renderer | **Buy** (Vertex VTON) | Licensing + no infra + built-in provenance |
| Pose / landmarks | **Open source** (MediaPipe, Apache 2.0) | Commercially clean, free, runs client-side |
| Measurement estimation | **Build** (thin geometry layer) | Small, ours, explainable |
| Size matching + confidence | **Build** | The actual IP; explainability is the demo's differentiator |
| Body-shape 3D (SMPL) | **Defer** | SMPL has its own restrictive licence; unnecessary at MVP |

**Note on SMPL:** frequently recommended in the literature, but the SMPL model licence is restrictive for
commercial use. Same trap as the VTON models. Avoid it at MVP; if it becomes necessary, licensing is a
procurement conversation, not a technical one.

---

## Sources

- [Comparing the Top 4 Open Source Virtual Try On (VITON) Models — FASHN](https://fashn.ai/blog/comparing-the-top-4-open-source-virtual-try-on-viton-models)
- [Awesome-Try-On-Models — GitHub](https://github.com/Zheng-Chong/Awesome-Try-On-Models)
- [Virtual Try-On — Google Cloud Vertex AI docs](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/virtual-try-on-preview-08-04)
- [Generate Virtual Try-On images — Google Cloud](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/generate-virtual-try-on-images)
- [Pricing Update for Developer API — FASHN](https://fashn.ai/blog/pricing-update-for-developer-api)
- [UK Ecommerce Return Rate Benchmark 2026 — Eightx](https://eightx.co/blog/uk-ecommerce-return-rate-benchmark)
- [Fashion Ecommerce Return Rate 2026 — Aisthetix](https://aisthetix.com/blog/fashion-ecommerce-return-rate)
- [Predicting Human Body Measurements Using MediaPipe Pose Auto-Capture](https://proc.3dbody.tech/papers/2023/2333zong.pdf)
- [Estimation of 3D Body Shape and Clothing Measurements from Frontal- and Side-view Images](https://arxiv.org/pdf/2205.14347)

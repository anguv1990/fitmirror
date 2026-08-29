# 03 — UK Compliance and Security

> **Not legal advice.** This is an engineering-grade analysis to structure the build and to brief a
> lawyer or DPO efficiently. Anything going to real shoppers needs professional review.

## 1. The headline: you are probably *not* in Article 9 — and you should design to keep it that way

Under UK GDPR, biometric data is **special category data only when processed "for the purpose of uniquely
identifying a natural person."** Virtual try-on and size recommendation do not identify anyone — they
render a garment and match a measurement. On the ICO's own framing, **that is not special category
processing**, and the heightened Article 9 conditions do not bite.

Two things must stay true for that to hold:

1. **We never build a biometric template.** The ICO is explicit that a photograph is not automatically
   biometric data — but if facial features are *extracted and transformed by an algorithm into a biometric
   feature*, it becomes biometric data. So: **no face embeddings, no face recognition, no face matching,
   ever.** MediaPipe *Pose* (body landmarks) is fine. Face Mesh / face embedding is not. This is a
   one-line architectural rule with large legal consequences.
2. **We never use the photo to identify or re-identify anyone**, including deduplicating users by face.

**Design rule to carry into implementation:** body landmarks only; discard face region as early as
possible; consider blurring the face before any image is transmitted for rendering, where the render
quality permits.

### What it still *is*

Not-Article-9 does not mean not-personal-data. A photo of an identifiable person, and their body
measurements, are **plainly personal data**. Full UK GDPR obligations apply: lawful basis, transparency,
minimisation, retention limits, security, and data subject rights. The relief is only from the Article 9
special-category regime.

## 2. Lawful basis

| Processing | Basis | Notes |
|---|---|---|
| Shopper uploads a photo for try-on | **Consent** (Art 6(1)(a)) | Explicit, unbundled, freely given, withdrawable. Must be a real choice — the measurements path is the alternative. |
| Shopper enters measurements | **Consent**, or contract if part of a purchase flow | Lower sensitivity, same discipline |
| Demo with licensed/synthetic images (**our D2 choice**) | **No personal data of third parties** | This is why D2 was the right call |

**Consent must be specific.** "I agree to the terms" is not consent to process a body photo. It needs its
own checkbox, its own sentence, and it must state that the image is processed by Google Cloud and deleted
immediately.

## 3. DPIA — required or not?

A DPIA is required for processing likely to result in high risk, and the ICO's list includes biometrics,
large-scale processing, and innovative technology.

| Scenario | DPIA needed? |
|---|---|
| **Demo with synthetic/licensed images only (D2)** | **No.** No personal data of data subjects. Document the reasoning and move on. |
| Team's own photos, consented, deleted after | Not strictly required at this scale; a short screening note is proportionate |
| **Public/audience upload (gate G6)** | **Yes — do it before the demo.** Innovative tech + body imagery + public participants |
| Any real production deployment | **Yes, unambiguously** |

**This is why G6 matters and why it is a gate rather than a detail.** Choosing D2 kept the MVP out of DPIA
territory. Turning on audience upload puts it straight back in — and a DPIA is not a document you write
the night before.

## 4. AI transparency

Two obligations, one already solved:

1. **Synthetic content disclosure.** Vertex VTON applies **SynthID watermarking and C2PA Content
   Credentials** automatically. That is a real compliance asset — provenance is handled by the vendor.
   **But metadata is not disclosure to a human.** Also surface `aiGenerated: true` in the API response
   and a visible label in the UI.
2. **EU AI Act Article 50** requires disclosure that content is AI-generated, for EU-facing deployments.
   The UK has no direct equivalent yet, but any UK retailer selling into the EU is in scope. Cheap to
   comply with now; expensive to retrofit.

## 5. Consumer-law exposure: do not overclaim the fit

An under-appreciated risk for a retail audience. Claiming a precision the system does not have could
engage the **Consumer Protection from Unfair Trading Regulations** and **ASA/CAP** rules on misleading
advertising.

Concretely:
- Do **not** say "guarantees your perfect fit" or quote an accuracy figure you have not measured yourself.
- **Do** present a confidence score and a plain-English caveat.
- The literature's ~90% size-estimation accuracy is *someone else's result on someone else's data*. Do not
  put it on a slide as if it were ours.

## 6. Bias and fairness — a live issue, not a footnote

The research on photo-based measurement records a specific, documented bias: **captured outlines
underestimate widths more than depths, and the effect is stronger for female subjects.**

Consequences to design for:

- Under-reading width means **systematically recommending sizes that are too small**, and doing so
  unevenly across genders. For a returns-reduction product, that is a failure of the core promise, and for
  a retail brand it is a reputational problem.
- **Test across a range of body types, sizes and skin tones** before demoing. A try-on model that renders
  poorly on darker skin or larger bodies is a serious problem — and reviewers and judges do notice.
- **Disclose the caveat in the API response** (`estimateCaveat` in the `/api/fit` contract) rather than
  hiding it.
- Prefer **declared measurements over estimated** wherever the shopper will provide them: more accurate,
  less biased, less personal data processed. All three point the same way.

## 7. Data residency — pending gate G1

If `virtual-try-on-001` is **not** available in an EU/UK region, shopper images would transit to a US
region. That is not fatal (UK–US data bridge / IDTA routes exist) but it:

- adds a transfer mechanism and documentation burden,
- weakens the compliance story for a UK retail audience, and
- must be disclosed in the consent copy.

**Mitigations if G1 fails:**
1. Keep D2 (synthetic images) — no personal data crosses any border, so the issue disappears for the demo.
2. Run the fit path fully client-side (MediaPipe in-browser) so the *fit* feature involves no transfer.
3. Document the transfer honestly in the demo narrative rather than claiming UK-only processing.

Option 1 plus 2 means the MVP can be fully defensible even if G1 fails. **That resilience is a direct
consequence of decisions D2 and the client-side pose choice** — worth noting as evidence the architecture
is doing its job.

## 8. Security controls checklist

- [ ] Shopper images processed **in memory only** — never written to disk or object storage
- [ ] No images, measurements, or PII in application logs, including error paths
- [ ] No personal data in URLs or query strings
- [ ] Secrets in Secret Manager; **never** committed (`.env*` already gitignored in this repo)
- [ ] Least-privilege service account — Vertex predict only, no storage write
- [ ] HTTPS end to end; HSTS
- [ ] Rate limiting per IP and per session (also a cost control)
- [ ] Dependency vulnerability scan before the public demo
- [ ] Consent checkbox unbundled, with plain-English copy naming Google Cloud as processor
- [ ] Visible "AI-generated image" label in the UI, not only in C2PA metadata
- [ ] Deletion is trivially demonstrable — because nothing is ever stored

**The strongest privacy control here is architectural, not procedural: if nothing is retained, most of the
risk surface does not exist.** Retention policies are things you can fail to honour. "We never wrote it
down" is not.

---

## Sources

- [Biometric recognition — ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/biometric-data-guidance-biometric-recognition/)
- [Key data protection concepts — ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/biometric-data-guidance-biometric-recognition/key-data-protection-concepts/)
- [What is special category data? — ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/)
- [ICO publishes biometric data guidance — Ropes & Gray](https://www.ropesgray.com/en/insights/viewpoints/102j5cq/ico-publishes-biometric-data-guidance)
- [Virtual Try-On — Google Cloud Vertex AI docs](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/virtual-try-on-preview-08-04)
- [Estimation of 3D Body Shape and Clothing Measurements from Frontal- and Side-view Images](https://arxiv.org/pdf/2205.14347)

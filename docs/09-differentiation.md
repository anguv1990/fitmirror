# 09 — What We Actually Do Differently

Written to be used when preparing the demo, so it leads with the weaknesses. A pitch built on a claim a
judge can puncture in one question is worse than a smaller claim that holds.

Retrieved 2026-08-31.

---

## 1. Start with what is *not* differentiated

**The idea is not novel. This is a mature, crowded market.**

| Company | Age | Position |
|---|---|---|
| **True Fit** | 17 years | Manufacturing design data from thousands of brands, anonymised order data from hundreds of retailers, preference data from millions of users |
| **Fit Analytics** | 16 years | Acquired by Snap; ML size recommendation at scale |
| **Bold Metrics** | 13 years | "Digital twin" body data, AI size recommendation |

Also in the space: Kiwi Sizing, Size n Fit, and others. Reported industry results are **~30% reduction in
size-related returns and 15–20% conversion uplift**.

**The render is commoditised too.** Google shut down Doppl on 30 April 2026 and moved virtual try-on into
Search and Shopping for the US, UK and India — free, across billions of listings
(`08-vton-2026-and-next.md`).

**So the sentence to never say is "virtual try-on with size recommendation."** A judge who knows the market
answers: *True Fit has done that since 2009, and Google gives the picture away.* Both halves of that reply
are correct.

### The moat we cannot cross

The incumbents' advantage is **data we do not have and cannot get**: real order histories, real return
reasons, real garment pattern and grading data. No hackathon build competes on that axis. Any pitch
implying better fit accuracy than True Fit is one question from collapsing.

---

## 2. What is genuinely different

Four things. Each is checkable in the repo rather than asserted.

### 2a. The recommendation is auditable

Incumbents output a size from a model trained on purchase and return histories. It is accurate and it is a
black box.

Ours states its reasoning in centimetres against a published band — *"100.3cm sits at the smaller end of
UK 16 (100–104cm)"* — carries a confidence score, names its source chart, and shows the next-best size with
what changes: *"UK 14 — above this band, would pull."*

**Why that is a property and not a nicety.** A recommendation a retailer can audit is one they can defend
to a customer, to trading standards, and under AI transparency expectations. It also degrades honestly: a
partial measurement lowers confidence rather than silently guessing.

`lib/fit/recommend.ts`, `components/SizeRecommendation.tsx`, `components/SizeComparison.tsx`.

### 2b. Zero cold-start

Incumbents need order and returns history before they work. **We need a published size chart.**

That is a real deployment difference for the segment the incumbents structurally cannot serve — a new
brand, a small label, a long-tail retailer with no purchase history. Day one, no data, working
recommendation.

### 2c. Structural privacy rather than policy privacy

Measurement runs in the browser via MediaPipe; the photo never leaves the device on that path. Nothing is
stored anywhere, so **there is no deletion process because there is nothing to delete.**

Incumbents are account-based profiling systems by design. Ours holds nothing between requests.

This started as a compliance decision and turned into a strategic one: as `08-vton-2026-and-next.md` argues,
the medium-term scarce asset is a *lawfully held* body profile. Storing nothing is a defensible position,
not a limitation.

### 2d. Disclosure generated from code — the actual novelty

This is the part that is genuinely unusual engineering rather than a better version of something existing.

`lib/compliance/disclosure.ts` holds one record per provider. The consent copy, the privacy page and the
AI-generated label all render **from** those records:

- Change `TRYON_PROVIDER` or `MEASUREMENT_PROVIDER` and **the consent text rewrites itself** to name the new
  processor. Verified: switching to `3dlook` produced *"To measure you, it is also sent to 3DLOOK, Inc.
  (3dlook.ai)"* and removed the local-only reassurance, with no copy edited by hand.
- A provider with **no disclosure record throws**, which closes the photo path rather than asking for
  consent to something the system cannot describe.
- `processingRegion` stays `null` while gate G1 is unresolved, and the UI says the location is unconfirmed.
  A test fails if an unverified region ever produces an affirmative claim.

**Most teams have a slide about responsible AI. This is a running proof.**

---

## 3. The honesty record

Worth having to hand, because it is unusual and judges notice it.

- **Confidence caps at 0.95.** Garment cut varies within a size; certainty is never claimed.
- **`simulated` and `aiGenerated` are separate flags.** The mock composites artwork, so it is *not*
  AI-generated — labelling it so would be a false disclosure in the other direction.
- **The hip measurement was deleted, not tuned.** Calibration against real photos showed it reading ~30cm
  low, because the multiplier was applied to MediaPipe's hip *joint positions* rather than the outer hip.
  Changing the constant from 3.1 to ~4.3 would have made the output look right while still measuring the
  wrong thing.
- **`requireGarmentPhotograph` fails before spending money.** A hosted model handed vector artwork returns
  a confident useless render and bills for it, so the check happens before the request.
- **The calibration module refuses to move a multiplier below 8 distinct people**, and says so, rather than
  fitting six photos of one person.

The through-line: **every one of these was a decision to be less impressive on purpose.**

---

## 4. Is this innovative enough for a hackathon?

**It depends on the judging criteria, and it is worth being honest with yourself about which event this is.**

| Judged on | Verdict |
|---|---|
| Visual wow / novel application | **Weak.** The render is a mock, and the real one is free in Google Search. |
| Responsible AI, governance, trust | **Strong**, and genuinely differentiated. |
| Enterprise readiness, compliance | **Strong.** UK GDPR analysis, DPIA reasoning, gated spend. |
| Technical depth of the ML | **Weak.** MediaPipe off the shelf; band matching is not sophisticated. |
| Engineering judgement | **Strong.** The decision record is the artefact. |

### The demo moment nobody else will have

Thirty seconds, live:

1. Show the consent panel saying measuring happens on-device and no third party is involved.
2. Change one environment variable on stage.
3. The consent text **rewrites itself** to name a new data processor; the privacy page updates; the
   AI-generated label flips.
4. Remove the disclosure record — **the photo feature switches itself off.**

Then say: *the compliance copy is not a document beside the code, it is generated from it, so it cannot go
stale.*

That is provable, takes half a minute, and is not something a team can fake on a slide.

---

## 5. The pitch

**Do not lead with virtual try-on.** Lead with:

> **A size recommendation you can audit, that works on day one with no data, and proves its own compliance.**

Then, in order:
1. The size, the reason, the confidence, and the two-size comparison — *which one do I order*, not *does it
   suit me*.
2. The live disclosure swap.
3. The render, framed honestly as supporting evidence — and the fact that Google gives it away is the
   argument for why fit is the product.

---

## 6. Claims we must not make

Per `03-compliance-uk.md` §5 — consumer-law and ASA/CAP exposure:

- **Not "reduces returns by 30%".** That is the industry's result on someone else's data. We have no users
  and no measured outcome.
- **Not "accurate measurements from a photo".** One measurement, uncalibrated, with a known width-under-read
  bias.
- **Not "your photo never leaves your device"** as a blanket claim. True of measurement, false of the render.
- **Not "GDPR compliant".** Say what the system does; a lawyer decides the label.

---

## 7. Where the pitch is weakest — expect these questions

| Question | Honest answer |
|---|---|
| *"Isn't this just True Fit?"* | They win on data. We win on explainability, cold-start, and privacy. Different segment. |
| *"Google does try-on free — why you?"* | Google shows the picture. It does not tell you which size to order. That is the returns problem. |
| *"How accurate is the measurement?"* | Unknown. The harness is built and waiting for tape measurements. We removed what we could not measure rather than guess. |
| *"Your try-on is a mock."* | Correct, and labelled as such in the UI. Real inference is gated on a spend cap and licensed garment photography, both deliberate. |
| *"Only chest from a photo?"* | Yes. Waist and hip have no supporting landmark. Recovering hip needs image segmentation. |

**The weakest single point is measurement accuracy**, because we have no ground truth. The best answer is
the harness plus the deleted hip: it shows the discipline is real rather than rhetorical.

---

## Sources

- [Ecommerce size recommendation platform comparison 2026](https://ustechautomations.com/resources/blog/ecommerce-size-recommendation-automation-comparison-2026)
- [Fit Analytics — CB Insights](https://www.cbinsights.com/company/fit-analytics)
- [Bold Metrics vs True Fit — CB Insights](https://www.cbinsights.com/compare/bold-metrics-vs-true-fit)
- Google try-on in Search, and the 2026 research landscape — see `08-vton-2026-and-next.md`

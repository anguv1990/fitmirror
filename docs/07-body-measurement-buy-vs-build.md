# 07 — Body Measurement: Buy vs Build

Analysis of moving from our own pose-based estimate to a 3D-avatar measurement service in the
3DLOOK / Mobile Tailor mould. Written before any implementation, per the gate discipline.

Retrieved 2026-08-30.

---

## 1. The premise to correct first

> "Build one step to identify the user's height."

**Height cannot be derived from photographs.** This is geometry, not a gap in our implementation: a
monocular image has no absolute scale. A 180cm adult far from the lens and a 90cm doll close to it project
identically. Something of known size must enter the frame, or the number must be supplied.

**3DLOOK does not solve this either — it asks.** Mobile Tailor takes **gender, height and weight as user
input**, then derives the remaining measurements from a front and side photo. So adopting 3DLOOK would not
remove the height question; it would keep exactly the requirement we already have.

That is worth stating plainly because it changes what is worth building. The four real options for height:

| Option | Cost | Friction | Accuracy |
|---|---|---|---|
| **Ask** (what we do, and what 3DLOOK does) | £0 | One field | As honest as the shopper |
| **Reference object** in frame — A4 sheet, bank card | £0 | High: find object, hold it, reshoot | Good, if placed at body depth |
| **ARKit / ARCore depth** | £0 | Native app or WebXR; iOS LiDAR only | Very good |
| **Known camera intrinsics + floor plane + gyroscope** | £0 | Fragile across devices | Moderate |

**Recommendation: keep asking, and start validating the answer.** A declared height is currently trusted
without challenge, yet every downstream number scales linearly with it — a shopper who types 175 instead of
185 shifts every measurement by 5.7%. Cross-checking the declared height against the pose (head-to-heel
pixel span combined with typical proportions) would catch typos and unit confusion, which is a larger
practical win than a heroic attempt to derive it.

---

## 2. What 3DLOOK actually offers, and what it costs

Two products. The apparel one is **Mobile Tailor**; **FitXpress** is aimed at fitness and telehealth.

| Plan | Price | Scans | API access |
|---|---|---|---|
| Mobile Tailor Basic | **$499/mo** | 100 | ❌ Widget only |
| Mobile Tailor Premium | **$999/mo** | 500 | ❌ Widget only |
| Mobile Tailor Enterprise | **Quote only** | 500+ | ✅ API/SDK |
| FitXpress Starter | **$1,000/mo** | 500 | ✅ |
| FitXpress Pro | **$1,500/mo** | 1,000 | ✅ |

Annual plans save up to 20%. Free trials exist. No per-scan overage price is published.

**Three things follow, and the third is the one that matters:**

1. **The product we want, at the tier we want, has no published price.** FitMirror is API-first; Mobile
   Tailor's API is Enterprise-only and quote-only. Every public number above is for a product that is
   either the wrong fit (FitXpress) or the wrong integration model (widget).
2. **Entry cost is ~$500–1,000/month.** Against a brief that says keep control of cost and do not overspend
   for a hackathon MVP, that is not a demo budget. The **free trial is the only realistic route** for the
   demo, and a trial is not a foundation to architect on.
3. **The floor is a monthly subscription, not per-use.** Our current path costs £0 and scales to unlimited
   scans, because it runs in the shopper's browser.

### Stated compliance position

3DLOOK states HIPAA compliance and that it "adheres to GDPR principles", with TLS and S3-managed
encryption, and that images are **blurred, used only to generate the scan result, and deleted immediately
after processing**.

That is a good posture, and the deletion commitment is genuinely strong. Two caveats:

- **"Adheres to GDPR principles" is not the same as "is a compliant processor."** For a UK retail
  deployment we would need a signed DPA naming them as processor, and their sub-processor list.
- **No data residency is published.** That is the same unresolved shape as gate G1 for Vertex: until the
  processing region is confirmed, we cannot claim UK or EU processing. Our disclosure module already
  handles this correctly by refusing to state a region it does not have.

---

## 3. The open-source route — and the same trap as last time

The obvious build-it-ourselves path is a parametric body model: fit **SMPL** or **SMPL-X** to photos and
read circumferences off the mesh. This is what the academic literature does and what several commercial
products are built on.

**It is commercially poisoned in exactly the way IDM-VTON was.**

- **SMPL** and **SMPL-X** model licences grant use for **non-commercial scientific research, education or
  artistic projects only**. Commercial use — including incorporation in a product or service — is
  prohibited.
- Commercial licensing exists, but only via **Meshcapade**, as a separate negotiated agreement.
- **SMPL-Body** (the mesh output) *is* CC BY 4.0 — but that subset **excludes the shape blendshapes**, which
  are precisely the part needed to fit a body shape and take measurements from it. The permissive licence
  covers the part we do not need.

This is the second time the strongest open-source option in this domain has turned out to be
research-licensed. It is the same finding that produced decision **D3**, and it should raise the prior:
in this market, assume the good open models are non-commercial until proven otherwise.

**What stays genuinely free and commercially clean:** MediaPipe Pose (Apache-2.0), which is what we already
use. It gives landmarks, not a body shape — hence coarse circumference estimates.

---

## 4. The comparison

| | Ours today (MediaPipe) | 3DLOOK Mobile Tailor | SMPL / SMPL-X |
|---|---|---|---|
| Cost | **£0**, unlimited | ~$500–1,000/mo floor, API tier quote-only | £0 research / negotiated commercial |
| Measurements | 2 (chest, hip) — hip currently wrong | **80+** | Many |
| Accuracy | Uncalibrated, coarse | Vendor-claimed, independently unverified by us | Good, published |
| Photo leaves device | **No** | **Yes** | Depends on hosting |
| Needs declared height | Yes | **Yes** | Yes |
| Commercial licence | ✅ Apache-2.0 | ✅ Commercial | ❌ **Prohibited** without Meshcapade deal |
| Works offline at the demo | **Yes** | No | Self-hosted only |
| Time to integrate | — | Days, plus procurement | Weeks |

---

## 5. What buying would cost us architecturally

The current design has one unusually strong privacy property: **for measurement, the photo never leaves the
device.** That is what makes the consent copy short and the compliance story simple, and it is what keeps
the fit path working with the wifi off.

Sending photos to 3DLOOK reverses that. Specifically it would require:

- A **DPA** with 3DLOOK as processor, plus their sub-processor list
- A **transfer mechanism** (UK IDTA / addendum) unless UK or EU residency is confirmed
- The privacy notice and consent copy to name them — **already handled**: adding a disclosure record makes
  the consent sentence name them automatically (`lib/compliance/disclosure.ts`)
- Re-testing the Article 9 argument. A full 3D body avatar is a far richer personal dataset than a shoulder
  width in pixels. It is still very likely **not** special category — we do not use it to identify anyone —
  but the argument is thinner and should be re-read against `03-compliance-uk.md` §1 rather than assumed to
  carry over.
- Losing the offline demo guarantee for the measurement path

**None of this is a reason not to buy.** It is the bill that comes with buying, and it should be paid
deliberately.

---

## 6. The second seam — **built 2026-08-31**

Not a replacement for the local estimator: a seam in front of it, exactly as `TryOnProvider` did for
rendering. `lib/measure/`, selected by `MEASUREMENT_PROVIDER`, default `local`.

Verified by running with `MEASUREMENT_PROVIDER=3dlook`: the consent copy gained "To measure you, it is also
sent to 3DLOOK, Inc. (3dlook.ai)", `/privacy` switched its measurement card and kept the region unconfirmed
per G12, and the local-only reassurance disappeared. No copy was hand-edited.

```ts
// lib/measure/types.ts
export interface MeasurementProvider {
  readonly name: string;
  /** Requires declared height — no provider, ours or theirs, escapes this. */
  measure(input: MeasurementInput): Promise<MeasurementResult>;
}
```

- `local` (default) — MediaPipe in the browser. Free, offline, photo never transmitted.
- `3dlook` — front and side photos to Mobile Tailor, 80+ measurements back.

Properties this buys us:

- **The demo never depends on a vendor.** Default stays local, so a fresh clone and a wifi-less venue both
  work.
- **Swapping is one file plus one registry line**, matching the stated requirement that the stack stay easy
  to change if the team proposes something else.
- **Consent copy follows automatically** from the disclosure record. This is the second time that design has
  paid for itself.
- **A/B comparison becomes possible**: run both against the same photos in `/dev/calibrate` and get a real
  accuracy number for our own estimator instead of a vendor claim. That is the strongest argument for the
  seam — 3DLOOK's free trial becomes ground truth for gate G8.

---

## 7. Gates before any integration

| # | Gate | Owner |
|---|---|---|
| **G11** | Confirm Mobile Tailor **API tier pricing** — it is quote-only, and the published tiers exclude API access | You (contact sales) |
| **G12** | Confirm **data residency**. Same shape as G1: no UK/EU confirmation ⇒ no residency claim in the notice | You |
| **G13** | Obtain a **DPA** and sub-processor list | You |
| **G14** | Start a **free trial** and run it against the G8 calibration photos before committing any spend | Either |
| **G15** | Re-read the Article 9 argument against a full 3D avatar (`03-compliance-uk.md` §1) | Either |

---

## 8. Recommendation

**For the hackathon: do not buy.** A $500–1,000/month floor for a product whose API tier is quote-only fails
the cost constraint, and losing offline operation costs us the one demo guarantee that cannot be bought
back on the day.

**Do these three things instead, in order:**

1. **Fix the hip defect** (gate G8). Hip estimates are ~30cm low because the multiplier is applied to
   MediaPipe's hip *joint centres* rather than outer hip breadth. Free, and it is a real bug rather than a
   missing feature.
2. **Validate declared height** instead of trusting it. Cheap, and it protects every downstream number.
3. **Use the 3DLOOK free trial as ground truth**, not as infrastructure. Run the trial against the same
   photos in `/dev/calibrate`. That converts a vendor evaluation into the calibration data gate G8 has been
   waiting for — and it is worth doing whichever way the buy decision eventually goes.

**Revisit buying when** the product has real users, when 80+ measurements would actually change a size
recommendation (today the engine uses three), and when a monthly floor is a rounding error against returns
saved. For an MVP whose thesis is that fit recommendation reduces returns, the binding constraint is
calibration and honesty, not measurement count.

---

## Sources

- [3DLOOK Mobile Tailor](https://3dlook.ai/mobile-tailor/)
- [3DLOOK pricing](https://3dlook.ai/pricing/)
- [FitXpress](https://3dlook.ai/fitxpress/for-connected-and-digital-fitness/)
- [SMPL model licence](https://smpl.is.tue.mpg.de/modellicense.html)
- [SMPL-X model licence](https://smpl-x.is.tue.mpg.de/modellicense.html)
- [SMPL-Body CC licence](https://smpl.is.tue.mpg.de/license.html)

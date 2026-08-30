# 05 — Privacy Notice and Consent Copy

> **Not legal advice.** Engineering-grade drafting, intended to be reviewed by a lawyer or DPO before
> anything reaches real shoppers. Companion to `03-compliance-uk.md`, which sets out the legal position
> this text implements.

This closes **gate G10** (consent copy, AI-generated label, privacy one-pager).

---

## 1. The design decision that matters

**The disclosure text is generated from the code, not written alongside it.**

`lib/compliance/disclosure.ts` holds one `ProcessingDisclosure` record per try-on provider: does the photo
leave the device, is a third party involved, is the region established, is anything retained, is the output
AI-generated. The consent bullets and the `/privacy` page are rendered *from* those records.

The failure this prevents is specific and common. Someone swaps `TRYON_PROVIDER` from `mock` to a hosted
model, and a sentence reading "no third party receives it" silently becomes a false statement to a data
subject. Here, that swap changes the sentence — or, if nobody has written a disclosure for the new provider,
`getDisclosure` throws and `ConsentGate` closes the photo path rather than asking for consent to something
it cannot describe.

`lib/compliance/disclosure.test.ts` asserts every provider registered in `lib/tryon/index.ts` has a
disclosure on file, and that no disclosure describes a provider that has been removed.

## 2. Two processing paths, two different answers

Conflating these would be the easiest way to mislead someone here, because the honest answer differs:

| | Measuring you from the photo | Rendering the garment on you |
|---|---|---|
| Runs | In your browser (MediaPipe Pose, WASM) | On the server, via the active provider |
| Photo leaves the device | **No** | **Yes** |
| Third party | None | Depends on provider — `mock`: none; `replicate`: Replicate, Inc. |
| Retained | No | No |
| Output AI-generated | No | `mock`: no (it composites fixed artwork); `replicate`: yes |

**Do not let the UI collapse these into a single "your photo never leaves your device" claim.** That is true
of the measurement path and false of the render path.

## 3. Consent

Implemented in `components/ConsentGate.tsx`, gating panel A only.

- **Unbundled.** Its own checkbox, its own sentences. "I agree to the terms" is not consent to process a
  body photo (`03-compliance-uk.md` §2).
- **Freely given.** It gates the photo panel alone. Panel B still produces a size from typed measurements,
  so declining leaves a working product rather than a dead end. Without that alternative the consent would
  be a toll gate and arguably not freely given at all.
- **Specific.** Each bullet names one concrete thing that will happen, generated from the active provider.
- **Withdrawable, with effect.** Withdrawal clears the consent, the photo, and the render. It also clears
  measurements *if* they were estimated from the photo; measurements the shopper typed are their own and are
  left alone.
- **Unticked by default**, and granted only by a positive action.

### Session-scoped by choice

Consent is held in React state and is not persisted. Two reasons: persisting it is itself a retention
decision, and consent that survives a page the shopper thought they had left is not what they agreed to.

## 4. AI transparency

`docs/03-compliance-uk.md` §4 requires a visible label, not only C2PA/SynthID metadata. Metadata is
provenance; it is not disclosure to a human looking at a screen.

The label is rendered **on the image**, in `components/TryOnResult.tsx`, from `renderLabel()`.

**`simulated` and `aiGenerated` are separate flags, and the distinction is the point.** The mock composites
fixed garment artwork over the photo. It is not a real fit *and it is not AI-generated*. Labelling it
"AI-generated" would be a false disclosure in the opposite direction — so `renderLabel` states the
placeholder case explicitly, and reserves "AI-generated image" for output that genuinely is.

Where a provider contradicts itself by setting both, the placeholder warning wins: it is the more important
claim and the less misleading one.

## 5. What the notice deliberately does not say

- **It does not claim UK or EU processing.** Gate G1 is unresolved. While `processingRegion` is `null`, both
  the consent copy and `/privacy` say the location has not been confirmed. A test asserts that no
  affirmative "Processing happens in: …" statement is produced for an unestablished region.
- **It does not promise deletion on request.** It says there is nothing to delete, which is stronger and
  also true.
- **It does not claim accuracy.** Consistent with `03-compliance-uk.md` §5, the notice states that estimates
  are approximations with a known width-under-read bias, and that a recommendation is a suggestion.

## 6. Still open

- **G6 is unresolved.** This copy is written for the D2 position — the demo runs on licensed or synthetic
  imagery, or on the operator's own photo. **If audience upload is turned on, a DPIA is required first**,
  and this notice needs a lawful-basis review, a retention statement for any incident logging, and a named
  controller and contact route. It is not sufficient on its own for public participants.
- **No named controller or contact address.** Deliberately left blank rather than invented; fill in before
  any real deployment.
- **Not reviewed by a lawyer or DPO.**
- **Cookie/consent banner: none, because there are no cookies and no analytics.** If anything is added that
  sets storage, this becomes a separate obligation under PECR.

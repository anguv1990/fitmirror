# CONTEXT

FitMirror's ubiquitous language: the terms this project uses, and where each one is defined
in code. Deliberately thin — it names things and points at them, it does not re-explain them.

`CLAUDE.md` holds the standing rules. `docs/agents/domain.md` tells agent skills how to read
both. When a term here and the code disagree, the code wins and this file is stale.

## Terms

| Term | Means | Defined in |
| --- | --- | --- |
| **Provider seam** | The boundary that keeps everything above it backend-agnostic. Two exist: try-on and measurement. A provider is selected by env var against a registry. | `lib/tryon/`, `lib/measure/` |
| **Try-on provider** | Implements `TryOnProvider`. Selected by `TRYON_PROVIDER`, default `mock`. | `lib/tryon/` |
| **Measurement provider** | Implements `MeasurementProvider`. Selected by `MEASUREMENT_PROVIDER`, default `local`. | `lib/measure/` |
| **Disclosure record** | One `ProcessingDisclosure` per provider. Consent copy, the render label and `/privacy` are generated **from** it. Never hand-edit the copy; change the record. | `lib/compliance/disclosure.ts` |
| **`runsOn: "browser"`** | Restates as "the photo stays on the device". The routing in `lib/measure/client.ts` and this privacy claim are one statement, not two. | `lib/measure/client.ts` |
| **Simulated** | The mock composites garment artwork at fixed coordinates. Not try-on, not AI. Flagged `simulated: true`. | `lib/tryon/mock.ts` |
| **AI-generated** | A model actually generated the pixels. A **separate flag** from `simulated` — conflating them is a false disclosure in one direction or the other. | `TryOnResult` |
| **Garment art** | Inline SVG for the picker thumbnail and the mock. **Not a photograph.** | `Garment.art` |
| **Garment photograph** | What every hosted model needs. `kind` is recorded, never inferred from a file extension; `requireGarmentPhotograph` throws *before* a request, because a hosted model handed vector art returns a confident useless render and bills for it. | `Garment.image`, `lib/garmentImage.ts` |
| **Body measurements** | What a size chart is matched against. **Never garment measurements** — those include the maker's ease allowance and silently oversize everyone. | `BodyMeasurements`, `SizeChart` |
| **Ease** | Slack between body and garment. Applied as an adjustment from `FitPreference` **before** band matching, not after. | `lib/fit/recommend.ts` |
| **Band matching** | The fit engine: weighted match of chest 0.6 / waist 0.25 / hip 0.15 against a chart's bands. Makes no network calls. | `recommendSize` |
| **Asymptotic decay** | How out-of-range values score, in **absolute centimetres**. A relative measure has produced the same bug twice: a wide or open-ended band beats a much nearer narrow one. | `lib/fit/recommend.ts` |
| **Chart audience** | Who a size chart sizes: `womens` or `mens`. **A different axis from `GarmentCategory`** — category is *what a garment is*, audience is *who the chart is for*. Both charts carry tops, so category cannot select between them; conflating the two was a real bug. | `ChartAudience`, `SizeChart.audience` |
| **Chart mismatch** | A garment/chart pairing the source data contradicts — a dress against a menswear chart. The size is **suppressed**, not captioned, following the rule already applied to `unreliable` measurements. Deliberately narrow: silence where the data supports no opinion. | `lib/chartMatch.ts` |
| **Out of chart range** | Tests the chart's overall span, not band membership — real charts have gaps (Seasalt jumps 94→96cm at S/M). | `outOfChartRange`, `chartSpan` |
| **Measurement confidence** | `measured \| estimated \| unreliable`. `toBodyMeasurements()` drops `unreliable` values so a number known to be wrong cannot move a size, while its note still reaches the UI. | `MeasurementConfidence` |
| **Pose landmarks** | The only body features extracted. **Never facial features** — a face embedding reclassifies this as biometric data under UK GDPR Article 9. | `lib/pose/`, `REQUIRED_LANDMARKS` |
| **Gate** | A prerequisite that must be green before the work behind it starts. G1 EU/UK region, G2 price, G3 budget cap, G11 3DLOOK API reference, G16 garment photography. | `docs/04-prerequisite-gate.md` |

## Terms this project avoids

- **"Virtual try-on" for the mock.** It composites artwork. There is no body detection,
  segmentation, or pose warping anywhere in `lib/tryon/mock.ts`.
- **"Your photo never leaves your device"** as a blanket claim. True of local measurement,
  false of the try-on render. The two processing paths are never described together.
- **"Hip measurement"** from a photo. Landmarks 23/24 are hip *joint positions*, not the
  outer hip; circumference is taken at the widest point over the buttocks. Estimating it
  shipped once and read ~30cm low, and was removed rather than retuned.

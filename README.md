# FitMirror

Virtual try-on. Give it a photo of yourself — uploaded or captured from your webcam — pick a garment from the
catalog, and see the fit.

## Quickstart

```bash
npm install
npm run setup:pose   # vendors the MediaPipe model + WASM (~15MB, one time)
npm run dev
```

Open http://localhost:3000. No API keys or environment setup needed: the default try-on provider runs offline.

`setup:pose` downloads the pose model into `public/mediapipe/` (gitignored — too large for git). It is only
needed for the photo-based measurement path; the rest of the app runs without it. Vendoring rather than
loading from a CDN means the demo works with wifi disabled.

## Size recommendation

`POST /api/fit` returns a recommended size with a confidence score and a plain-English reason. It makes no
network calls and costs nothing to run, so it keeps working when the try-on renderer is unavailable.

```bash
curl -X POST localhost:3000/api/fit -H 'Content-Type: application/json' \
  -d '{"measurements":{"chestCm":98},"sizeChartId":"uk-mens-tops"}'
```

`GET /api/fit` lists the available charts.

### Size charts

| Chart | Source | Verified |
| --- | --- | --- |
| `boden-womens` (default) | [Boden UK](https://www.boden.com/pages/womens-size-fit-chart), retrieved 2026-08-29 | ✅ Real published **body** measurements |
| `seasalt-mens` | [Seasalt Cornwall](https://www.seasaltcornwall.com/size-guide), retrieved 2026-08-29 | ✅ Real published **body** measurements |

Both shipped charts are real. Responses still carry `sizeChartVerified`, and the UI prints a caveat whenever
it is `false`, so any placeholder added later cannot be presented as authoritative.

The body-vs-garment distinction matters more than it sounds: garment measurements include the maker's ease
allowance, so matching a body against them silently oversizes everyone. Both charts are confirmed body
measurements by their own instructions — Boden's "Measure under your arms, across the fullest part of your
bust", and Seasalt's "Measure a full circumference around the fullest part of the chest".

Real charts also leave **gaps between bands** (Seasalt jumps 94→96cm at S/M). Someone landing in a gap is
still on the chart: `outOfChartRange` tests the chart's overall span, not band membership.

### Photo-based measurement

`components/PhotoMeasure.tsx` estimates chest and hip from a photo using MediaPipe Pose, **entirely in the
browser**. The image never leaves the device; only the derived numbers are sent, and only on submit.

Three things to know:

- **Declared height is required.** A photo has no absolute scale, so height is what turns pixels into
  centimetres.
- **Waist is deliberately not estimated.** There is no waist landmark and the individual variation is far too
  wide to interpolate honestly.
- **The output is a coarse approximation, not a measurement.** Circumference is inferred from width using
  population averages. Responses carry a caveat naming the known bias toward under-reading width.

A dev harness for this path lives at `/dev/pose`.

## The mock provider

**The default provider does not perform virtual try-on.** It layers the garment artwork over your photo at
fixed coordinates — no body detection, no segmentation, no warping to your pose. It exists so the full
request/response path and the loading and error states work on a fresh clone without credentials or GPU time.
Results come back flagged `simulated: true`, and the UI labels them accordingly.

Real inference is a swap, not a rewrite.

## Swapping in a real model

Everything above `lib/tryon/` is provider-agnostic. To add a backend:

1. Implement `TryOnProvider` (`lib/tryon/types.ts`) — one method, `run(request, garment)`.
2. Register it in the `PROVIDERS` map in `lib/tryon/index.ts`.
3. Set `TRYON_PROVIDER=<name>` in `.env.local`.

`lib/tryon/replicate.ts` is a worked example against Replicate's IDM-VTON. It is **not** ready to use as-is;
two things are stubbed and documented in the file:

- The catalog stores garments as inline SVG, but hosted try-on models expect photographs of real garments.
  `Garment` needs an `imageUrl` field pointing at a publicly reachable product image.
- It polls for the prediction inline. That is fine locally but should become a webhook plus a job record
  before it sees real traffic, since predictions can outlive a serverless request.

## Environment

Copy `.env.example` to `.env.local`. All values are optional while using the mock provider.

| Variable | Purpose |
| --- | --- |
| `TRYON_PROVIDER` | `mock` (default) or `replicate` |
| `REPLICATE_API_TOKEN` | Required when `TRYON_PROVIDER=replicate` |
| `REPLICATE_TRYON_VERSION` | Optional model version pin |

## Layout

```
app/
  page.tsx              flow state: photo -> garment -> result
  layout.tsx
  globals.css           Tailwind v4 theme (@theme, no tailwind.config)
  api/tryon/route.ts    POST: validates, resolves garment, delegates to provider
components/
  PhotoSource.tsx       upload + webcam capture, camera lifecycle
  GarmentPicker.tsx
  TryOnResult.tsx       loading / error / result states
lib/
  types.ts              Garment, TryOnRequest, TryOnResult
  garments.ts           the catalog (hardcoded; no DB yet)
  tryon/                provider interface, mock, replicate, resolver
```

Garments live in `lib/garments.ts` as inline SVG in a `0 0 100 140` box. That markup is the single source of
truth — the picker thumbnail and the composited result both render it, so they cannot drift apart. Each
garment's `fit` places it on the photo as fractions of the photo's dimensions.

## API

`POST /api/tryon`

```jsonc
// request
{ "personImage": "data:image/jpeg;base64,...", "personWidth": 600, "personHeight": 800, "garmentId": "tee-oatmeal" }

// 200
{ "image": "data:image/svg+xml;base64,...", "garmentId": "tee-oatmeal", "provider": "mock", "elapsedMs": 701, "simulated": true }
```

Status codes distinguish causes: `400` bad input or unknown garment, `501` provider selected but not
configured, `502` provider ran and failed.

## Scripts

| Command | |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` / `npm start` | production build and serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Not built yet

No auth, no database, no persistence of past try-ons, no payments, no real model weights.

## Known advisories

`npm audit` reports two advisories in `postcss`, pulled in transitively by Next 15. Both concern CSS
processing at build time — this app does not process untrusted CSS. The only available fix is Next 16, a major
upgrade, so it has been left alone deliberately rather than forced.

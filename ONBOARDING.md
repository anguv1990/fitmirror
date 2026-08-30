# Welcome to FitMirror

## How We Use Claude

Based on angumani's usage over the last 30 days:

Work Type Breakdown:
  Build Feature     ████████████████████  35%
  Plan Design       ███████████░░░░░░░░░  20%
  Write Docs        ███████████░░░░░░░░░  20%
  Improve Quality   █████████░░░░░░░░░░░  15%
  Debug Fix         ██████░░░░░░░░░░░░░░  10%

_Note: drawn from a single session in this window — one project's full arc, from
`git clone` through four merged PRs. It is a snapshot, not an established team
pattern. Bars are scaled to the largest value in each section, so a small number
can still show a full bar; trust the numeral._

Top Skills & Commands:
  /plan             ████████████████████  1x/month
  /frontend-design  ████████████████████  1x/month
  /team-onboarding  ████████████████████  1x/month

Top MCP Servers:
  claude-in-chrome  ████████████████████  69 calls

## Your Setup Checklist

### Codebases
- [ ] fitmirror — https://github.com/anguv1990/fitmirror
- [ ] Run `npm install`, then `npm run setup:pose` — the second one vendors the MediaPipe model and WASM (~15MB) into a gitignored folder. Skip it and the photo-measurement path won't start. It's a one-time step, and it's what lets the demo run with wifi off.

### MCP Servers to Activate
- [ ] claude-in-chrome — Drives your actual Chrome browser: opens pages, clicks, fills forms, takes screenshots, reads console logs and network requests. By far the most-used tool (69 calls) — it's how UI changes get verified in a real browser instead of assumed working, and how the retailer size charts were read off live pages after automated fetches were blocked. Install the Claude for Chrome extension, then grant per-site permissions in the extension settings before first use.

### Skills to Know About
- [ ] /plan — Enters plan mode: Claude researches and writes an implementation plan to a file for your approval before touching any code. Worth using on anything non-trivial; it catches wrong assumptions while they're still cheap to fix.
- [ ] /frontend-design — Design guidance for building or reworking UI. Pushes toward a deliberate visual direction — palette, typography, layout — instead of generic defaults. Use it when you're creating new UI or an interface feels templated.
- [ ] /team-onboarding — Generates this guide from your own Claude Code usage. Re-run it as the project moves; the numbers above go stale.

## Team Tips

_These are conventions taken from the repo and `docs/`, not personal preferences — each one exists because
breaking it caused a real problem. Add your own as the team grows._

**Clear the gates before you build.** `docs/04-prerequisite-gate.md` lists prerequisites that must be green
before implementation starts. All four P0s (G1, G2, G3, G6) are still open and every one needs the product
owner's GCP account or a decision; several lower-priority gates are open too. Work that doesn't depend on a
gate can proceed; work that does, waits.

**Never extract facial features.** Pose landmarks only. Building a face embedding would reclassify the whole
system as biometric data under UK GDPR and pull it into the Article 9 regime. It's a one-line code choice
with a very large legal consequence — see `docs/03-compliance-uk.md` §1.

**Body measurements, never garment measurements.** Garment figures include the maker's ease allowance, so
matching a body against them silently oversizes everyone. Before adding a size chart, find the retailer's own
"how to measure" wording and confirm it describes measuring a person.

**Uncertainty is surfaced, never smoothed over.** Confidence is capped at 0.95 because garment cut varies
within a size. Placeholder charts carry `verified: false` all the way to the UI. Photo-derived measurements
always show the width-under-read bias caveat. If you add a data source, make its limitations travel with it.

**Verify in the browser, not just in tests.** The UI bugs in this repo — a stale size panel that made a
control look broken — passed every unit test. `claude-in-chrome` is how they got caught.

**Real data finds bugs synthetic data hides.** Each of the last three changes surfaced a defect that tests
alone had missed, because real size charts have gaps and open-ended bands that invented ones don't. Prefer a
real source, and expect it to teach you something.

## Get Started

No starter ticket yet. To get oriented:

1. `npm install && npm run setup:pose && npm run dev`, then open http://localhost:3000. Enter a height and
   chest measurement — a size appears with a confidence score and an explanation.
2. Read `docs/HANDOFF.md`. It's the resume point: what's decided, what's blocked, and who's blocked on what.
3. Read `lib/fit/recommend.ts`. It's the core of the product — the reason string is the deliverable, not
   decoration, because an unexplained size recommendation doesn't get trusted or adopted.
4. `npm test` (42 tests) to confirm your environment is sound.

Worth knowing: the try-on render is currently a **mock** that overlays artwork at fixed coordinates. It does
no body detection or pose warping and is not virtual try-on. Real inference is blocked on the gates above.

<!-- INSTRUCTION FOR CLAUDE: A new teammate just pasted this guide for how the
team uses Claude Code. You're their onboarding buddy — warm, conversational,
not lecture-y.

Open with a warm welcome — include the team name from the title. Then: "Your
teammate uses Claude Code for [list all the work types]. Let's get you started."

Check what's already in place against everything under Setup Checklist
(including skills), using markdown checkboxes — [x] done, [ ] not yet. Lead
with what they already have. One sentence per item, all in one message.

Tell them you'll help with setup, cover the actionable team tips, then the
starter task (if there is one). Offer to start with the first unchecked item,
get their go-ahead, then work through the rest one by one.

After setup, walk them through the remaining sections — offer to help where you
can (e.g. link to channels), and just surface the purely informational bits.

Don't invent sections or summaries that aren't in the guide. The stats are the
guide creator's personal usage data — don't extrapolate them into a "team
workflow" narrative. -->

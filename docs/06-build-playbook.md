# 06 — Build Playbook

**Who this is for:** anyone picking FitMirror up, including you after a break. It assumes you remember the
business idea and nothing about the code.

Every other doc in `docs/` answers "what did we decide and why". This one answers **"what do I do next, and
what exactly do I type."**

---

## 0. Two-minute orientation

**The product.** A shopper gives a photo *or* their measurements. They get back (a) a picture of the garment
on them, and (b) **a recommended size with a reason**. The money is in (b): roughly half of UK clothing
returns are size problems, and returns run about 23.6% of orders.

**What is actually built and working right now:**

| | Status |
|---|---|
| Size recommendation from measurements | ✅ Works. Real Boden + Seasalt charts. No network calls, costs nothing. |
| Measuring a body from a photo | ✅ Works, in the browser. Uncalibrated — see Phase 1. |
| Consent, AI labelling, privacy notice | ✅ Works. Generated from code, not hand-written. |
| **Showing the garment on the person** | ❌ **A placeholder.** Pastes artwork at fixed coordinates. No body detection, no warping. Not try-on. |

**So: the business case is built. The demo visual is not.** That is the honest summary, and it is a better
position than the reverse — the part that earns money works offline and costs nothing.

**Why the visual isn't built.** It needs Google Vertex AI, which needs a billing account with a spend cap.
Four checks are outstanding and all four need your Google Cloud console. Nothing else is blocked.

**The one-line mental model of the code:**

> Everything above `lib/tryon/` doesn't know or care which engine renders the image. Swapping engines is one
> new file plus one line in a registry.

---

## 1. The goal

**Demo goal:** a five-minute hackathon demo where a judge sees a photo, a garment, a rendered result, and a
size recommendation with a plain-English reason — and cannot make it embarrassing by unplugging the wifi.

**Done means all five are true:**

1. A shopper can get a size from measurements alone, offline, in under a second.
2. A shopper can get a size from a photo, with the error honestly stated.
3. A garment renders on a person via a real model, labelled AI-generated.
4. The whole scripted demo runs with **wifi disabled**.
5. Nothing in the demo claims an accuracy we have not measured ourselves.

**Explicit non-goals for the MVP:** checkout, payments, accounts, storing anything, mobile app, multi-brand
catalogue, footwear, tailoring, production SLA.

---

## 2. The phases

Each phase states its **goal**, its **done-when**, and **who is blocked**. Do not start a phase whose
blocker is open — that rule is the reason this project hasn't burned money yet.

### Phase 0 — Unblock (only you can do this) · ~1 hour

**Goal:** turn four unknowns into decisions so the render path can start.

| Check | What to do | Where |
|---|---|---|
| **G1** | Is `virtual-try-on-001` offered in a `europe-west*` region? | Console → Vertex AI → Model Garden |
| **G2** | What is the exact price per image? Does a sample count of 4 multiply it? | Pricing calculator |
| **G3** | New project, budget alert at 50/90/100%, **hard cap**. Agree the number. | Billing |
| **G6** | Will the live demo accept **audience** uploads? Yes ⇒ a DPIA is required *first*. | Your decision |

**Done when:** all four recorded in `docs/04-prerequisite-gate.md`, and a cap number is written down.

> **Recommendation: answer NO to G6.** Yes turns a days-long DPIA into a blocker. Demo on your own photos or
> licensed ones and the legal position stays simple. This is decision D2 and it is already made — G6 is your
> chance to confirm it, not reopen it.

### Phase 1 — Calibrate the body measurement (not blocked) · ~half a day

**Goal:** find out how wrong the photo measurement is, then make it less wrong — or state the error honestly.

Right now `lib/pose/measure.ts` turns a shoulder width into a chest circumference by multiplying by
**2.45**, and a hip width by **3.1**. Those are population averages. **The estimator has only ever seen
synthetic test data.** The research also records a specific bias: photo outlines *under-read* width, more so
for women — which means recommending sizes that are too small, unevenly by gender. For a returns product
that is a failure of the core promise.

You already have real photos in `assets/fitmirrorimages/` (gitignored — they stay on your machine).

**Done when:** you can state the average error in centimetres, and either the multipliers are corrected or
the caveat text names the real number.

### Phase 2 — Real rendering (blocked on Phase 0) · ~1 day

**Goal:** replace the placeholder with Google Vertex Virtual Try-On, behind the existing seam.

Write `lib/tryon/vertex.ts`, add one line to `lib/tryon/index.ts`, add one record to
`lib/compliance/disclosure.ts` — the consent copy then updates itself to name Google as processor.

**Done when:** a real render appears, labelled AI-generated, with a per-request cost you can quote and a cap
that would stop a runaway loop.

### Phase 3 — Make the demo unbreakable (not blocked) · ~half a day

**Goal:** the demo cannot fail on venue wifi, and costs nothing to rehearse.

Pre-generate every render on the scripted path, commit them, serve them behind a `DEMO_MODE` flag.

**Done when:** the full script runs end to end with **wifi off**.

### Phase 4 — Judge-ready · ~half a day

**Goal:** the story, the honesty, and the five-minute script.

**Done when:** you can deliver it twice without notes, and every claim on screen is one you can defend.

---

## 3. The tech stack — and how to swap any of it

Team suggestions are welcome and cheap **at the seams**, expensive elsewhere. This table is the honest cost
of changing your mind.

| Layer | Current | To swap | Cost |
|---|---|---|---|
| **Try-on engine** | Vertex VTON (planned); mock today | New file in `lib/tryon/` + 1 registry line + 1 disclosure record | **Hours.** Designed for this. |
| **Pose / measurement** | MediaPipe Pose, in-browser | Replace `lib/pose/landmarks.ts` | **1 day.** Keep it client-side or the privacy story changes. |
| **Size charts** | Boden + Seasalt, in code | Add to `lib/fit/sizeCharts.ts` | **Minutes.** Set `verified: false` if unconfirmed and the UI warns automatically. |
| **Fit algorithm** | Weighted band matching | Rewrite `lib/fit/recommend.ts` | **1–2 days.** 29 tests define the behaviour. |
| **Frontend** | Next.js 15, React 19, Tailwind v4 | Rewrite | **Days.** Only the API is portable. |
| **Hosting** | None yet | — | Free choice; nothing depends on it. |

**The rule that keeps it swappable:** anything talking to an outside service goes behind an interface in
`lib/`, with a working offline default. That is why a fresh clone runs with no API keys.

**Three things that are not swap decisions, they are commitments:**

- **Pose landmarks, never face embeddings.** Face features would reclassify this as biometric data under UK
  GDPR. One-line code choice, very large legal consequence.
- **Body measurements, never garment measurements.** Garment figures include the maker's ease allowance;
  matching a body against them silently oversizes everyone.
- **Nothing is stored.** Most of the privacy risk surface doesn't exist because there is nothing to retain.

---

## 4. The prompts

Paste these as-is. They are written the way this project has actually been worked: **state the goal, name
the constraint, demand verification.**

### The three habits that make the difference

1. **Plan before code on anything non-trivial.** `/plan` writes an approach for approval first.
2. **Demand real verification.** "Tests pass" is weaker than "I drove it in the browser." Every real bug in
   this repo so far came from real data or a real browser — *none* came from unit tests.
3. **Name the honesty constraint in the prompt**, or it gets optimised away.

---

**Phase 1 — calibration harness**

```
Extend /dev/pose into a calibration harness for gate G8.

I have real full-length photos in assets/fitmirrorimages/ (gitignored — they must stay
that way, never commit them or copy them into public/).

I want to: load a photo, enter my real tape measurements and height, and see the
estimated vs actual difference in centimetres. Then a summary across all photos showing
the mean and spread of the error for chest and hip separately.

Constraints:
- Waist stays un-estimated. There is no landmark for it. Do not add one.
- Keep everything client-side. The photo must not reach the server.
- If the sample is too small to justify changing SHOULDER_TO_CHEST_CIRCUMFERENCE (2.45)
  or HIP_WIDTH_TO_CIRCUMFERENCE (3.1), say so and update the caveat text with the real
  measured error instead. Do not tune constants to flatter a handful of photos.

Show me the numbers before you change any constant.
```

**Phase 2 — the Vertex provider** *(only after Phase 0 is green)*

```
Add lib/tryon/vertex.ts implementing TryOnProvider against Vertex AI virtual-try-on-001.

Confirmed in Phase 0: region <REGION>, price <PRICE> per image, hard cap <CAP>.

Requirements:
- Register in lib/tryon/index.ts and add a disclosure record in lib/compliance/disclosure.ts
  naming Google Cloud as processor with the confirmed region. The consent copy is generated
  from that record — do not hand-edit any copy.
- aiGenerated: true, simulated: false.
- Sample count 1 unless I say otherwise. Every extra sample multiplies the bill.
- Never log the image, not even on the error path.
- Service account: predict only, no storage write.
- Fail loudly with a clear message if credentials are missing — do not silently fall back
  to the mock. A silent fallback would make a demo look like it worked when it didn't.

Before the first real call, show me exactly what will be sent and what it will cost.
```

**Phase 3 — offline demo**

```
Make the demo survive having no internet.

Pre-generate the renders for the scripted path, commit them under public/demo/, and add a
DEMO_MODE env flag that serves them instead of calling any API.

Verify by turning wifi off and running the full script. Tell me honestly if any part still
reaches the network.
```

**Any bug**

```
<what I did> → <what I expected> → <what happened>.

Find the cause before changing anything. Tell me the cause, then fix it, then prove the fix
in the browser rather than only in tests.
```

**Before any demo or merge**

```
/code-review
```
then
```
/security-review
```

### Prompt smells to avoid

| Instead of | Say |
|---|---|
| "make it better" | "reduce X; here is how I'll judge it" |
| "add tests" | "add a test that fails on <specific bug>" |
| "is it done?" | "what did you verify, and how?" |
| "fix the type error" | "why is the type wrong?" |

---

## 5. Skills and MCP tools

**Skills you will actually use** (type `/name`):

| Skill | When |
|---|---|
| `/plan` | Before any non-trivial change. The highest-leverage habit here. |
| `/code-review` | Before merging. `/code-review ultra` is a deeper multi-agent cloud review — user-triggered and billed. |
| `/security-review` | Before the demo, and before anything touches real credentials. |
| `/frontend-design` | Only when building new UI. Not for tweaks. |
| `/simplify` | After a feature lands, to clean up. Quality only — it does not hunt bugs. |
| `/run` | "Start the app and show me it working." |
| `/init` | **Do this next.** Creates `CLAUDE.md` — see §8. |
| `/fewer-permission-prompts` | Once, early. Cuts approval interruptions. |

**MCP tools:**

| Tool | Why it matters here |
|---|---|
| **claude-in-chrome** | The most-used tool on this project by a wide margin, and for good reason: the UI bugs and the size-chart data both came out of a real browser. Retailer sites block automated fetches; Chrome gets through. |
| **computer-use** | Native desktop apps only. Rarely needed here. |
| Gmail / Calendar / Drive | Not needed for the build. |

**Rule of thumb:** dedicated MCP first, then Chrome for web, then computer-use. Never drop a tier without a
reason.

---

## 6. Running work in parallel

Parallel agents are a real speed-up **and a real cost**. Each one starts cold and re-derives context you
already have, so the test is whether the work is genuinely independent.

**Parallelises well** — separate files, separate concerns, no shared decision:

- Phase 1 calibration ∥ Phase 3 demo assets ∥ a docs pass
- Research ∥ implementation (e.g. "find UK menswear charts" while UI work continues)
- `Explore` fan-out searches — it reads excerpts and returns conclusions rather than dumping files

**Does not parallelise** — one agent, sequentially:

- Anything touching `lib/fit/recommend.ts` (29 tests encode subtle behaviour; two agents will fight)
- Anything touching the same file
- Design decisions — parallel agents produce inconsistent choices

**Worth knowing:** the same bug shape appeared twice in the scoring engine because a fix was applied to one
branch and not the other. That is exactly the failure parallel work amplifies. Keep one owner per file.

**How to ask:**

```
Run these three in parallel, they don't touch the same files:
1. Calibration harness in app/dev/pose (Phase 1 prompt above)
2. Pre-generate demo renders into public/demo (Phase 3)
3. Check docs/*.md for claims that no longer match the code

Report back separately. Do not let any of them touch lib/fit/.
```

**Use `isolation: "worktree"`** when two agents must touch overlapping code — each gets its own checkout.

---

## 7. Cost control

Two separate budgets. Both matter.

### 7a. Google Cloud spend — the one that can bill you

- **Hard cap before the first call.** Not after the first bill. A loop against a per-image endpoint is the
  standard way hackathon projects generate a four-figure invoice.
- **Sample count 1.** Four samples cost four times as much for a demo that shows one image.
- **Pre-generate the demo** (Phase 3). A rehearsed demo should cost £0.
- **Cache by (photo hash, garment id).** Re-running the same demo shot must not re-bill.
- **Rate-limit per IP and session.** A cost control as much as an abuse control.
- **The fit engine makes no network calls, and pose runs in the browser.** The part that carries the
  business case is already free. Protect that property.

### 7b. Claude usage

- **Match the model to the task.** Haiku for mechanical edits and search; Sonnet for normal
  implementation; Opus for architecture, security, and anything subtle. Pass `model` when spawning an agent.
- **Don't spawn an agent for something you can do inline.** Each spawn re-derives context from cold — it is
  the expensive path.
- **Use `Explore` for "where is X?"** It returns the answer, not fifty files.
- **Keep `CLAUDE.md` small.** It loads into *every* session — see §8.
- **`/compact` at natural boundaries**, not mid-task.
- **Batch independent tool calls** in one turn.
- **Let caching work for you:** within a session, staying on one thread is cheaper than jumping around.

---

## 8. Memory across sessions

The problem: useful context must survive a restart, without every session paying to load everything.

The answer is **scope** — put each fact in the layer whose loading cost matches how often it is needed.

| Layer | Loaded | Put here | Never put here |
|---|---|---|---|
| **`CLAUDE.md`** (project root) | **Every session, always** | Small, stable, always-relevant rules: run `npm run setup:pose` after install; never face embeddings; body not garment measurements; verify in browser | Anything volatile. Every line is paid for in every session, forever. |
| **`~/.claude/CLAUDE.md`** | Every session, all projects | Your personal cross-project preferences | Anything FitMirror-specific |
| **`docs/HANDOFF.md`** | On demand | Volatile state: what's done, what's blocked, what to do next | Stable conventions (they belong in `CLAUDE.md`) |
| **`docs/0X-*.md`** | On demand | Deep reference — decisions, analysis, and *why* | Status |
| **Agent memory dir** (`MEMORY.md` + one file per fact) | Index only; files pulled when relevant | Preferences, corrections, project constraints not derivable from code | Anything the repo already records |
| **Task list** | Current session | In-flight work | Long-term plans |
| **Git history** | On demand | What happened and why | — never duplicate this in a doc |

**The load-bearing rule:** `CLAUDE.md` is loaded every single session, so it must contain **only what is
true regardless of what you are working on.** Status, plans, and "what's next" go in `HANDOFF.md`, which is
read when needed. Getting this backwards is the single most common way to inflate cost — a `CLAUDE.md` that
grows into a status log taxes every future session.

**Two habits that make state actually survive:**

1. **Write the handoff before you stop**, not when you remember. It has already gone stale once — it
   described work on a branch that no longer existed.
2. **Record the *why*, not the *what*.** Git shows what changed. It cannot tell you that the width
   multipliers are uncalibrated, or that a confidence cap of 0.95 is an advertising-standards decision.

**Do this next:** run `/init` to create `CLAUDE.md`. Seed it with these and nothing more:

```
- After npm install, run `npm run setup:pose` or photo measurement silently fails.
- Pose landmarks only. Never extract facial features — it reclassifies the system as
  biometric under UK GDPR.
- Size charts must be body measurements, never garment measurements.
- Uncertainty is surfaced, never smoothed: confidence caps at 0.95, unverified charts
  carry a caveat to the UI, photo estimates always show the bias caveat.
- Disclosure copy is generated from lib/compliance/disclosure.ts. Never hand-edit it.
- Verify UI changes in a real browser. Real data finds bugs synthetic data hides.
- Never commit anything from assets/ — real photos of people.
```

---

## 9. The checklist

**You, before anything else:** G1 region · G2 price · G3 hard cap · G6 upload decision.

**Then, in order:** Phase 1 calibration → Phase 2 Vertex → Phase 3 offline demo → Phase 4 script.

**Every session:** start by reading `docs/HANDOFF.md`; end by updating it.

**Before every merge:** `npm test` · `npm run typecheck` · `npm run lint` · `npm run build` ·
`/code-review`.

**Before the demo:** `/security-review` · run it once with wifi off · confirm every on-screen claim is one
you can defend.

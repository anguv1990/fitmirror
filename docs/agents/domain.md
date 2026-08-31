# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring
the codebase. **Adapted for FitMirror's existing `docs/` layout** — this repo predates the
skills, and its decision records are numbered topic docs rather than a `docs/adr/` tree.

## Before exploring, read these

- **`CLAUDE.md`** at the repo root: the standing rules. It loads into every session already,
  but skills running in a subagent may not have it — read it explicitly before proposing
  changes. The section "Rules that exist because breaking them caused a real problem" is
  binding, not advisory.
- **`CONTEXT.md`** at the repo root: the glossary. Thin by design; it defines terms and
  points at the doc that explains each one.
- **`docs/NN-topic.md`**: this repo's decision records. Read the ones touching your area:

  | Doc | Decision it records |
  | --- | --- |
  | `01-landscape.md` | build-vs-buy, licensing traps |
  | `02-architecture.md` | the provider seams |
  | `03-compliance-uk.md` | UK GDPR posture; §1 is why pose landmarks only |
  | `04-prerequisite-gate.md` | gates G1–G16, what is blocked and why |
  | `05-privacy-notice.md` | user-facing privacy copy |
  | `06-build-playbook.md` | phases, cost control |
  | `07-body-measurement-buy-vs-build.md` | measurement provider choice |
  | `08-vton-2026-and-next.md` | try-on landscape |
  | `09-differentiation.md` | positioning, weaknesses first |

- **`docs/HANDOFF.md`**: current state and blockers. Read it at the start of any session that
  will change code; **update it before stopping work.**
- **`docs/adr/`**: does not exist yet. If a decision is genuinely narrower than a numbered
  topic doc, create `docs/adr/NNNN-slug.md` for it; otherwise extend the relevant numbered
  doc rather than starting a parallel tree.

There is no `CONTEXT-MAP.md`: this is a single-context repo, not a monorepo.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't
suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs`
and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually
get resolved.

## File structure

```
/
├── CLAUDE.md          ← standing rules (binding)
├── CONTEXT.md         ← glossary, cross-links docs/
├── docs/
│   ├── 01-landscape.md … 09-differentiation.md   ← decision records
│   ├── HANDOFF.md     ← current state, blockers
│   ├── adr/           ← not yet created; for decisions narrower than a topic doc
│   └── agents/        ← this directory: skill configuration
└── lib/, app/, components/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a
hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms
the glossary explicitly avoids — several of them are distinctions this repo has already paid
for. `simulated` and `aiGenerated` are the sharpest example: collapsing them is a false
disclosure, not a wording choice.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing
language the project doesn't use (reconsider) or there's a real gap (note it for
`/domain-modeling`).

## Flag conflicts with recorded decisions

If your output contradicts a numbered doc or a rule in `CLAUDE.md`, surface it explicitly
rather than silently overriding:

> _Contradicts `docs/03-compliance-uk.md` §1 (pose landmarks only), but worth reopening
> because…_

Two classes of rule are **not** reopenable by an agent, because they were decided against
external constraints rather than engineering taste:

- The honesty constraints in `CLAUDE.md` (the 0.95 confidence cap, `sizeChartVerified`,
  `simulated` vs `aiGenerated`, `processingRegion` staying `null` while G1 is open).
- Anything gated in `docs/04-prerequisite-gate.md` that the product owner must clear.

Raise these with the user; don't propose working around them.

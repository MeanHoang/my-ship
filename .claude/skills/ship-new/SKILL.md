---
name: ship-new
description: Use when the owner wants to start a brand-new app, product or project from an empty (or nearly empty) repo ("làm app mới", "dự án mới", "build from scratch", "new product idea"), before any feature work exists to copy patterns from. Not for features in an existing codebase (/ship).
---

# /ship-new — from idea to a working skeleton

Read first: `.claude/workflow/ship-core.md`, `.claude/workflow/blocks/P-product.md`, `.claude/roles/product.md`. There may be no `.claude/ship-profile.md` yet — this skill writes it.
Why a separate skill: `/ship` assumes existing code (pattern-reference gate, "what the app does today", surfaces). A new app first needs a product decision, a stack decision and a skeleton that later features can copy.

## Flow
| # | Step | Who | Stop? |
|---|---|---|---|
| 0 | K0 (repo, branch `main`/`feature/bootstrap`, `.claude/ship/<slug>/`, `mode: NEW`) | parent | — |
| 1 | **Gate 0 · Product** — block P: P1 research (+ forcing questions, one per turn, max 4) → P2 proposal + **mockup of the key screens**, `product.md`, verdict | product (`opus`) | 🚦 build / reframe / kill + mockup approved |
| 2 | **Gate 1 · Stack & architecture** — 2–3 options (languages, framework, data store, hosting, auth), each with fit to `product.md` §6–7, cost, lock-in, what the owner already knows; the minimal option is always one of them | scout (`opus`) researches, parent presents | 🚦 owner picks; ADR lines → `decisions.md` |
| 3 | **Phase 0 · Walking skeleton** — plan it like a `/ship` phase: repo scaffold from the official template/generator, lint + format, test runner with ONE real test, dev command, CI running lint + tests, and ONE thin end-to-end flow of the core job (UI → logic → storage) with a test | implementer (`sonnet`) → verifier (`sonnet`) | 🚦 commit |
| 4 | **Write the profile** — draft `.claude/ship-profile.md` from what now exists (§1 base branch, §2 surfaces, §4 test targets, §5 dev commands, §7 implementers, §8 review command, §9 ship, §12 edge cases from `product.md` §8) + §13 from `product.md` | parent | 🚦 owner reads it |
| 5 | Hand-off: each next feature = `/ship` (Gate 1 reuses `product.md`), or `/ship-auto` after its Gate 2 | — | — |

## Rules specific to a new app
- **Pattern-reference gate, day 0:** there is no sibling yet — the reference is the framework's official template or docs page (URL). From Phase 0 on, the skeleton IS the pattern: later code names a skeleton `file:line`.
- **No speculative structure:** no folders, abstractions or config for features that are not in `product.md` §6 (YAGNI). The skeleton proves one flow, nothing more.
- **Evidence still applies:** Phase 0 is "done" only with the CI run and the end-to-end test output (K4). A green scaffold with no test of the core flow is not done.
- `"move auto"` is allowed after Gate 1 (then Phase 0 and the first features run through `/ship-auto`); Gate 0 and Gate 1 always need the owner.

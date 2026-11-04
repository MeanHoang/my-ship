# Ship profile — <your project>

Copy to `.claude/ship-profile.md` in your repo and fill every section. The `ship-*` skills, blocks and roles are project-neutral; they point here as **profile §N**. Keep the section numbers. Write "n/a" rather than deleting a section.

## §1 Repo basics
- Base branch: `origin/main` (the hooks auto-detect it from `origin/HEAD`; override with env `SHIP_BASE_BRANCH`).
- Branch naming: `feature/<slug>` / `bugfix/<slug>`.
- Where tasks come from (Jira / Linear / GitHub issues / Notion …) and how Gate 1 reads them (a spec-analysis skill, or "read the issue").
- Production bugs from end users: which skill handles them (or "use /ship-bugs").
- Generated files that are never edited by hand.

## §2 Surfaces (for "who else uses this")
List every place a shared change can show up: apps, packages, public APIs, UIs, mobile clients, extensions. Where the surface map lives. The data/settings chain from where a value is stored to where it is rendered.

## §3 Reading real settings / data (K1 leg 3)
Priority-ordered sources the agent may READ (admin UI, read-only API/MCP, DB read replica, logs…), what each cannot see, and the write tools it must never call. What to do when an account is unreachable (ask the owner, save under `tmp/logs/`).

## §4 Test targets and browser
- Which environments/accounts the agent may use for testing and how to pick one (not deployed → local; deployed → the staging that runs this branch; …). State the target before the first screenshot.
- Browser tool (e.g. Claude in Chrome) and fallback, and the `/ship-verify` browser script if you have one (commands `doctor` / `open <feature>` / `ready` / `shot` / `console` / `measure`) plus its `feature-map.json` (feature names → route, clicks, ready text, traps).
- How test setup is allowed to happen (UI only? seed scripts?) and what is forbidden (writing production data).
- Typical viewport widths.
- Optional: a browser-only override recipe (intercept `fetch`, inject CSS) for reproducing with real data.

## §5 Dev stack
Start / stop / restart commands, how to pick a scope, port conflicts between worktrees, per-worktree install step.

## §6 Auth checks (K0)
| Needed for | Check |
|---|---|
| Logs | e.g. `gcloud auth print-access-token >/dev/null` |
| CI watch | e.g. `gh auth status` |
| Browser work | the browser tool answers |

## §7 Implementers and models
- Which agent implements which area (or `general-purpose`).
- Model per role: the default table in `.claude/workflow/ship-core.md` (scout/reviewer `opus`, implementer/verifier `sonnet`) — override here if needed. Always pass `model`.
- Project coding skills the implementer should load.

## §8 Review command
The command the reviewer subagent runs itself (e.g. `/code-review`, a project `/review` command). Never a paraphrase.

## §9 Ship
Push + PR/MR procedure (always return the link), pre-push checks (translations, changelog…), deploy procedure, CI watch, files that must never be staged.

## §10 Auto-run: extra PARK items
Decisions `/ship-auto` must never take alone in this repo (data migrations, paid infra, public API changes, …).

## §11 Project Standards per role
Rules that only hold in this repo, grouped under `### scout`, `### implementer`, `### reviewer`, `### verifier`. Each line: `- <rule> (source: <date> "<owner quote>")`. Pasted together with the role file on every dispatch.

### scout
### implementer
### reviewer
### verifier
### product
Product principles specific to this product (on top of roles/product.md), e.g. "no new setting without a real user need".

## §12 Review Focus defaults
Edge inputs every plan must test in this repo (existing users without the new field, feature flag off, empty state, non-English locale, very large accounts…).

## §13 Product context (for the product role)
- Who we are: the product, what we already do well, unfair advantages (the product role's "why us").
- Who the users are (segments) and who pays.
- Where evidence lives, cheapest first: support tickets, chats, analytics queries (read-only), app-store / marketplace reviews, sales notes.
- Known alternatives / competitors — or "research per task with dated sources".

## §14 Design system for mockups (product role, P2)
Which look the product role's HTML mockups should copy: component library / design tokens, the skill or doc that describes them, reference screens, target widths. New app with none yet → "clean neutral".

## §18 Diff guard (`.claude/scripts/diff-guard.mjs`, config `.claude/diff-guard.json`)
- `mainBranch`, and `coreFiles`: the shared formula files whose existing lines must never be rewritten (new logic goes in its own file behind a guard).
- Optional: `codePath` (regex of production code), `routesPath` (regex of route files) and `featureMap` (path) for the route check.
- Add a check to the script only from a review comment you have made at least twice.

## §16 Impact map (optional)
A command that lists what a change reaches (entry points, shared data). No such tool → write "none"; K4 and K5 then skip that step.

## §17 Edge review (optional)
A command that hunts edge cases on a backend diff. No such tool → write "none"; K5 goes on without it.

## §19 Test loop (`workflow/test-loop.md`)
- Local target and how to start and stop the stack (§5).
- Staging target, the integration branch, and the name of the session that owns it (it merges and deploys on `MERGE-DEPLOY`). No shared staging → write "local only".
- Base branch other than `main`: set `SHIP_BASE_REF` (e.g. `origin/master`) in the environment; `branch-drift`, `select-cases` and `codex-review` read it.
- Test environments the verifier may change freely, and what stays read-only.

---
name: ship-verify
description: Use when the owner asks whether a change really works or a bug is really fixed ("fix thật chưa", "verify giúp", "chứng minh đi", "test lại cái này"), or before anyone claims "fixed" outside a ship flow. Works on any branch, with or without a ship task.
---

# /ship-verify — prove it (K2 + K4 standalone)

Read first: `.claude/workflow/blocks/K2-reproduce.md`, `K4-confirm.md`, `.claude/roles/verifier.md`, profile §4/§5/§11 verifier.

1. Name the claim in one line ("bug X no longer happens when Y") and the test target + why (profile §4).
2. Dispatch ONE verifier subagent (role file + K4, `model: sonnet` per the ship-core table). It never edits production code.
3. **BE:** the covering test — or a new one — FAILS without the change and PASSES with it (K4 revert check, patch-based, never `git stash`), plus the package's existing tests. **FE:** before/after screenshots in the same state and widths; content-only checks via DOM/console/network.
4. Report: verdict **proven / not proven / cannot verify (why)**, with the raw output lines or opened images. No evidence → say "chưa verify", never imply it.
Does not fix anything. A failing verification is handed back as a finding.

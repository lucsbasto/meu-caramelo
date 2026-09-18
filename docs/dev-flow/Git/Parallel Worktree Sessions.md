---
title: Parallel Worktree Sessions
aliases: [parallel tasks, multiple tasks at once, worktree per task, session per task, run tasks in parallel, isolated task session, one branch per task]
summary: Parallel work = one git worktree + one branch + one session per task. Primary repo stays on main. Enforced by .githooks/pre-commit.
tags: [dev-flow/git]
created: 2026-09-17
template: ai-note
status: seed
---

# Parallel Worktree Sessions

Multiple tasks at once = one worktree + one branch + one session **per task**.
Never juggle parallel tasks in a single working tree — file churn collides and
history tangles.

## Rule

- Primary repo (`meu-caramelo/`) stays on `main`. It is integration-only.
- Each task gets its own linked worktree (`../meu-caramelo-<slug>`) on its own
  branch `lucas/<type>/<slug>`, driven from its own session.
- `main` receives changes via PR merge, never a local commit.
- No commit from the primary working tree. All commits happen inside a task
  worktree.

## Spawn a task

```
pnpm new-task feat oauth-pkce             # any OS (Node)
node scripts/new-task.mjs feat oauth-pkce # sem pnpm
```

Creates the worktree + branch and runs `pnpm install`. Then open a new session:

```
cd ../meu-caramelo-oauth-pkce && claude
```

## Lifecycle

Spawn worktree → work in its session → verify (`pnpm lint`, `pnpm typecheck`) →
atomic commits → PR → merge → clean up:

```
git worktree remove ../meu-caramelo-oauth-pkce
git branch -d lucas/feat/oauth-pkce
```

## Enforcement

`.githooks/pre-commit` blocks: commits from the primary tree, commits on
protected branches, and off-convention branch names. Bound via the `prepare`
script (`git config core.hooksPath .githooks`) on `pnpm install`.

Local hooks are bypassable with `--no-verify` — a knowing violation (see
[[Root-Cause vs Patch]]). The un-bypassable layer is GitHub branch protection
on `main` (require PR, block direct pushes, block force-push).

## Notes

- Each worktree needs its own `node_modules` (`pnpm install` per worktree).
- `.omc/` state is per-worktree; it is removed with the worktree unless
  centralized via `OMC_STATE_DIR`.

## Related

[[Branch Hygiene]] · [[Atomic Commit]] · [[Pre-Task Checklist]]

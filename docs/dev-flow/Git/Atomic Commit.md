---
title: Atomic Commit
aliases: [conventional commits, commit message, git history, commit granularity, commit format, commit subject]
summary: One concern per commit. Conventional format type(scope) subject ≤50 chars. Body explains WHY.
tags: [dev-flow/git]
created: 2026-04-29
template: ai-note
status: seed
---

# Atomic Commit

One concern per commit. Revertable in isolation. Conventional format.

## Format

```
type(scope): subject

body explains WHY, not WHAT
refs #123
```

Subject ≤50 chars, imperative ("add", not "added"), no trailing period.

## Types

| Type | Use |
|---|---|
| feat | new user-facing capability |
| fix | bug fix, behavior correction |
| refactor | restructure, no behavior change |
| docs | docs/comments only |
| test | tests only |
| chore | tooling, deps, config |
| perf | measurable speed/memory win |

## Splitting

| Mixed change | Split into |
|---|---|
| refactor + feat | `refactor:` first, `feat:` second |
| fix + unrelated cleanup | two commits |
| feature + its tests | one commit OK (tests prove feat) |
| rename + logic change | rename alone, then logic |

## Rule

If commit message needs "and", split it.

## Related

[[PR Template]] · [[Branch Hygiene]]

---
title: Refactor Safety
aliases: [refactor checklist, safe refactoring, refactor without regression, refactor pre-flight, refactor phases]
summary: Refactor phases — Pre (snapshot), during (small commits, behavior preserved), post (regression check).
tags: [dev-flow/retros]
created: 2026-04-29
template: ai-note
status: seed
---

# Refactor Safety

Checklist keeps refactor reversible. Refactor changes shape, not behavior — never bundle feature add.

| Phase | Checklist |
|-------|-----------|
| Pre | Snapshot tests green, types tight, scope written down |
| During | Smallest commits, behavior preserved, no API drift |
| Post | All tests green, perf within budget, diff readable |

**Pre-refactor**
- Capture baseline: tests pass, lint clean, types resolve
- Write down what stays the same (contract, signatures, side effects)
- Branch from clean main

**During refactor**
- One transform per commit (rename, extract, inline)
- Run tests between commits
- No new feature, no new dep
- If shape needs to change, stop — that's a design change, separate PR

**Post-refactor**
- Full suite green
- Perf benchmark unchanged (or document delta)
- Public API diff = empty
- Reviewer can read commits as story

If behavior changes, it's not refactor. Split PR. Land refactor first, feature second.

## Related
[[Verification Gates]] · [[Atomic Commit]] · [[Pre-Task Checklist]]

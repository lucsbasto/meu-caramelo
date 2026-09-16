---
title: Pre-Task Checklist
aliases: [task workflow, before coding, explore plan code verify, pre-flight, task phases]
summary: Workflow phases before non-trivial task. Explore → plan → code → verify.
tags: [dev-flow/loop]
created: 2026-04-29
template: ai-note
status: growing
---

# Pre-Task Checklist

Run before non-trivial task. Stops half-shipped work.

## Phases

| Phase | Action | Skip when |
|-------|--------|-----------|
| Explore | Read code, find prior art | Trivial 1-line fix |
| Plan | Step list, identify files | Single-file edit |
| Code | Smallest diff | Never |
| Verify | Tests + reviewer pass | Never |

## Triggers explore

- Multi-file change
- Unfamiliar module
- Bug w/ unclear cause
- "How does X work?" before edit

## Triggers plan

- 2+ files touched
- New abstraction
- Migration / refactor
- Cross-cutting concern

## Anti-patterns

- Edit before read
- Code before test exists
- Claim done before verify

## Related

[[Verification Gates]] · [[ADR Template]] · [[Atomic Commit]]

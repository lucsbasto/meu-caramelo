---
title: Systematic Debugging
aliases: [debugging method, hypothesis testing, debug workflow, bug investigation, repro first, how to debug]
summary: Debug loop: reproduce, hypothesize, probe, eliminate, fix root cause, regress.
tags: [dev-flow/debug]
created: 2026-04-29
template: ai-note
status: growing
---

# Systematic Debugging

Hypothesis log beats guessing. Reproduce first.

## Loop

1. Reproduce — minimal repro case
2. Hypothesize — list candidates
3. Probe — cheapest test per hypothesis
4. Eliminate — strike confirmed-false
5. Fix — root cause, not symptom
6. Regress — test prevents recurrence

## Hypothesis table

| # | Cause | Evidence for | Evidence against | Probe |
|---|-------|--------------|------------------|-------|
| 1 | Race condition | Intermittent | Single-thread test passes | Add sleep |

## Bisect strategy

- Git: `git bisect` for regression
- Code: comment half, narrow
- Input: shrink failing case

## Anti-patterns

- "Try this" w/o hypothesis
- Fix multiple things at once
- No repro before fix

## Related

[[Root-Cause vs Patch]] · [[Bug Postmortem Template]] · [[Refactor Safety]]

---
title: Verification Gates
aliases: [done criteria, completion check, test gates, pre-merge checks, evidence-based done, when is work done]
summary: Gates required before claiming work done. Compile, lint, test, review, manual.
tags: [dev-flow/loop]
created: 2026-04-29
template: ai-note
status: growing
---

# Verification Gates

No "done" claim without evidence. Self-approve banned.

## Gates

| Gate | Tool | Pass criteria |
|------|------|---------------|
| Compile | tsc / cargo check | Zero errors |
| Lint | rtk lint | Zero new violations |
| Test | rtk vitest / pytest | All pass, coverage stable |
| Review | code-reviewer agent | Zero blockers |
| Manual | UI / curl / repl | Golden path + 1 edge |

## Rules

- Author + reviewer = different passes
- UI work: open browser, click feature
- Type-check ≠ feature-correct
- Tests pass ≠ user need met

## Failure protocol

Iterate. Don't skip. Don't ship.

## Related

[[Pre-Task Checklist]] · [[PR Template]] · [[Bug Postmortem Template]]

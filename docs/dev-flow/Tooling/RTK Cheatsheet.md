---
title: RTK Cheatsheet
aliases: [rtk commands, rtk savings, rtk gain, rust token killer, token optimizer, shell prefix]
summary: RTK shell prefix cheatsheet. Always prefix rtk. 60-99% token savings on dev cmds.
tags: [dev-flow/tooling]
created: 2026-04-29
template: ai-note
status: growing
---

# RTK Cheatsheet

Prefix every shell cmd w/ `rtk`. Safe passthrough when no filter.

## High-savings cmds

| Cmd | Savings |
|-----|---------|
| rtk vitest / jest | 99% |
| rtk playwright test | 94% |
| rtk cargo test / pytest | 90% |
| rtk next build | 87% |
| rtk gh pr view | 87% |
| rtk docker logs | 85% |
| rtk tsc | 83% |
| rtk git diff | 80% |

## Meta

| Cmd | Use |
|-----|-----|
| rtk gain | Show savings |
| rtk gain --history | Cmd history + savings |
| rtk discover | Find missed opportunities |
| rtk proxy <cmd> | Bypass filter (debug) |

## Rules

- Chain: `rtk a && rtk b` — each cmd needs prefix
- Verify install: `rtk --version` (collision: reachingforthejack/rtk)
- Hook auto-rewrites; manual `rtk` still safe

## Anti-patterns

- `git push` (no rtk) inside chain
- `rtk rtk foo` (double prefix)
- Skip rtk for "fast" cmds — savings compound

## Related

[[Agent Routing]] · [[Skill Triggers]] · [[Verification Gates]]

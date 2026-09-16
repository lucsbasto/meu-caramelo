---
title: Agent Routing
aliases: [which agent, agent picker, model selection, opus sonnet haiku, agent delegation, when to delegate]
summary: Pick right agent + model. explore/planner/architect/executor/reviewer + haiku/sonnet/opus.
tags: [dev-flow/tooling]
created: 2026-04-29
template: ai-note
status: growing
---

# Agent Routing

Right agent + right model. Wrong pick wastes tokens & time.

## Agents

| Agent | Use |
|-------|-----|
| explore | Codebase search, find files |
| planner | Multi-step impl plan |
| architect | System design, debug strategy (read-only) |
| executor | Code writes, refactors |
| code-reviewer | PR review, severity-rated |
| debugger | Stack trace, regression isolation |
| verifier | Evidence-based completion check |
| document-specialist | SDK/API docs lookup |
| test-engineer | Test strategy, flaky hardening |
| writer | README, API docs |

## Models

| Model | Use |
|-------|-----|
| haiku | Quick lookup, low-stakes |
| sonnet | Standard work |
| opus | Architecture, deep analysis, security |

## Direct (skip agent)

- Trivial 1-cmd ops
- Single clarification
- Known file path edit

## Parallel triggers

- 2+ independent reads
- Multi-area research
- Build + test concurrent

## Related

[[Skill Triggers]] · [[Pre-Task Checklist]] · [[RTK Cheatsheet]]

---
title: Agent Loop Anatomy
aliases: [agent loop, autonomous loop shape, ReAct loop, plan act verify, when does agent stop, how many iterations agent, agent termination conditions]
summary: Autonomous agent loop shape. Perceive→plan→act→verify→reflect. Caps + termination triggers.
tags: [dev-flow/loop]
created: 2026-04-29
template: ai-note
status: seed
---

# Agent Loop Anatomy

Shape of one autonomous agent turn. Sits between entry gate (Pre-Task) + exit gate (Verification).

## Phases

| Phase | Action | Output |
|-------|--------|--------|
| Perceive | Read state: files, errors, user msg | Context snapshot |
| Plan | Decompose goal, list steps | TODO / plan.md |
| Act | Tool call w/ thought rationale | Side-effect |
| Verify | Test, lint, diagnostic, render | Pass/fail evidence |
| Reflect | Update plan, mark done, decide next | New state |

## Termination

| Trigger | Cap | Action |
|---------|-----|--------|
| Goal met + verified | — | Stop, report |
| Max iterations | 8–15 surgical, 25 broad | Stop, escalate |
| Context budget | ≥80% window | Compress / delegate subagent |
| Same failure ×3 | circuit break | Stop, escalate to architect |
| User cancel | — | Stop now |

## Rule

- Plan before act on multi-step task
- Thought block before tool call (why, not what)
- Verify after every state-changing act
- Never claim done w/o evidence
- Loop ≠ retry — diagnose root cause first

## Gate relation

| Gate | Where | Owner |
|------|-------|-------|
| Entry | Before loop | [[Pre-Task Checklist]] |
| Per-iter | Inside Verify phase | self |
| Exit | After loop | [[Verification Gates]] |

## Anti-patterns

- Skip plan on "simple" multi-file task
- Retry same broken approach >3x
- Verify only at end, not per step
- Claim done while context >90% full

## Related

[[Pre-Task Checklist]] · [[Verification Gates]] · [[Subagent Context Isolation]]

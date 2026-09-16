---
title: PR Template
aliases: [pull request template, pr description, pr body, pr summary, pr checklist, pr shape]
summary: PR shape — Summary bullets + Test plan checklist + Risk/rollback. Title ≤70 chars.
tags: [dev-flow/git]
created: 2026-04-29
status: seed
---

# PR Template

Three sections: Summary, Test plan, Risk. Title ≤70 chars. Link issue.

## Skeleton

```
## Summary
- bullet 1: what changed
- bullet 2: why now
- bullet 3: notable trade-off (optional)

## Test plan
- [ ] unit: <what>
- [ ] integration: <flow>
- [ ] manual: <steps>

## Risk / rollback
- blast radius: <scope>
- rollback: revert commit <sha> | toggle flag X
- migration: yes/no, reversible?

Closes #123
```

## Rules

| Section | Required | Notes |
|---|---|---|
| Title | yes | `type(scope): subject`, ≤70 |
| Summary | yes | 1–3 bullets, why over what |
| Test plan | yes | checkboxes, runnable |
| Risk | yes | how to undo |
| Screenshots | UI only | before/after |
| Issue link | yes | `Closes #N` or `Refs #N` |

## Smell

Empty test plan → reviewer rejects. "Tested locally" alone is not a plan.

## Related

[[Atomic Commit]] · [[Branch Hygiene]] · [[Verification Gates]]

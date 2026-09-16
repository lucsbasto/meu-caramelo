---
title: Root-Cause vs Patch
aliases: [symptom vs cause, when to patch, hot fix vs root fix, no-verify ban, hook bypass, banned shortcuts]
summary: When to fix root cause vs patch. Banned shortcuts: --no-verify, force-push, mock-the-bug.
tags: [dev-flow/debug]
created: 2026-04-29
template: ai-note
status: growing
---

# Root-Cause vs Patch

Symptom suppression hides bugs. Fix cause unless cost prohibitive.

## Decision

| Situation | Pick |
|-----------|------|
| Hot prod incident | Patch now, root-fix after |
| Pre-merge bug | Root cause |
| Flaky test | Root cause, never `--no-verify` |
| Hook failure | Read msg, fix, never bypass |
| Lock file conflict | Investigate, never delete |

## Banned shortcuts

- `--no-verify` (skip hooks)
- `git push --force` to shared
- Catch-all `try/except: pass`
- Disable failing test
- Mock the thing that broke

## Patch markers

If patching, leave breadcrumb:
- Issue link in commit
- TODO w/ tracker ID
- Test tagged `@known-issue`

## Related

[[Systematic Debugging]] · [[Bug Postmortem Template]] · [[Verification Gates]]

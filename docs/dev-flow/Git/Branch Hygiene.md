---
title: Branch Hygiene
aliases: [git branch naming, branch lifecycle, rebase vs merge, force push rules, branch cleanup, branch convention]
summary: Branch naming, rebase for personal, merge for shared. Never force-push to main.
tags: [dev-flow/git]
created: 2026-04-29
template: ai-note
status: seed
---

# Branch Hygiene

Naming `<user>/<type>/<slug>`. Rebase personal, merge shared. Delete after merge.

## Naming

```
lucas/feat/oauth-pkce
lucas/fix/null-token-crash
lucas/refactor/extract-cache
```

Slug: kebab, ≤40 chars, no ticket-only names (`lucas/feat/jira-1234` bad).

## Rebase vs Merge

| Branch type | Update with | Why |
|---|---|---|
| Personal feature, solo | rebase onto main | linear history |
| Shared feature, multi-dev | merge main in | preserve others' commits |
| Long-lived integration | merge | rebase rewrites shared SHAs |
| Stale PR before merge | rebase + force-push | clean for review |

## Force-push

| Target | Allowed? |
|---|---|
| main / master / release | NEVER |
| shared feature branch | only with team consent |
| personal branch (your PR) | yes, `--force-with-lease` |
| after rebase to update PR | yes, `--force-with-lease` |

Always `--force-with-lease`, never raw `--force`.

## Lifecycle

Open PR → review → rebase if stale → merge → delete branch local + remote.

## Related

[[Atomic Commit]] · [[PR Template]]

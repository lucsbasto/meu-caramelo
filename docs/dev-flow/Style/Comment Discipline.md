---
title: Comment Discipline
aliases: [code comments, commenting code, when to comment, comment style, jsdoc, docstrings, code documentation]
summary: When to write code comments. Default no. WHY only, never WHAT. No task refs, no JSDoc bloat.
tags: [dev-flow/clean-code]
created: 2026-04-29
template: ai-note
status: seed
---

# Comment Discipline

Default: no comment. Code names self. Comment only WHY when non-obvious.

## Rule

- Name function/var well → comment dies
- Comment WHY (constraint, invariant, bug workaround) — never WHAT
- No task refs ("for issue #123"), no PR links, no author tags
- No JSDoc/docstring bloat on internal helpers
- Public API: short signature doc OK, no prose essay

## When

| Situation | Comment? | Form |
|---|---|---|
| Obvious loop, getter, setter | No | — |
| Hidden constraint (rate limit, ordering) | Yes | `// must run before X — Y assumes sorted` |
| Workaround for upstream bug | Yes | `// workaround: lib X v1.2 returns null on empty` |
| Magic number | No comment, name constant | `const MAX_RETRY = 3` |
| TODO/FIXME without owner+date | No | delete or fix now |
| Restating code | No | delete |
| Public lib API | Short | one line, no `@param` spam |

## Smell

Three+ comment lines on one function = function too dense, split it.

## Related

[[YAGNI Rules]] · [[Root-Cause vs Patch]] · [[Single Responsibility]]

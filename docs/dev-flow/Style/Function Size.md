---
title: Function Size
aliases: [small functions, function too long, when to split function, do one thing, step down rule, one level of abstraction, function arguments, flag arguments]
summary: Functions small, do one thing, one abstraction level, ≤3 args, no flag args, no hidden side effects.
tags: [dev-flow/clean-code]
created: 2026-04-29
template: ai-note
status: seed
---

# Function Size

Small. One thing. One abstraction level. Read top-down. Few args.

## Rule

- ≤20 lines guideline; 3-5 line ideal for leaves
- Do one thing — if you can extract w/ a real name, split
- One level of abstraction per function (no biz logic mixed w/ string ops)
- Step-down: callers above callees, reads like narrative
- ≤3 args; 4+ → bundle into object
- No flag args (`fn(x, true)`) — split into two functions
- No side effects beyond name promises (CQS: do OR answer, not both)

## Smell Map

| Smell | Fix |
|---|---|
| Scrolling to see whole function | Extract sub-functions |
| Comments like `// setup`, `// process` | Split at section boundary |
| Mixed levels (`order.total()` next to `s.substring(0,5)`) | Extract low-level into helper |
| Boolean param flips behavior | Two functions, no flag |
| 4+ params | Argument object or split |
| Returns value AND mutates state | Split: query vs command |
| Nested `if`/`for` body >1 line | Extract block to named function |

## When Not to Split

- Single linear sequence at one abstraction level — leave alone
- Splitting only to hit line count → fragmentation, worse readability
- One-shot script, throwaway code

## Related

[[Comment Discipline]] · [[YAGNI Rules]] · [[Refactor Safety]]

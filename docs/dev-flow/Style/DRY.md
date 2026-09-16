---
title: DRY
aliases: [dont repeat yourself, knowledge duplication, am I duplicating, when to extract function, rule of three, incidental duplication, coincidental duplication, single source of truth]
summary: Duplicate knowledge = bug. Duplicate shape = fine. Wait for third instance before extracting.
tags: [dev-flow/clean-code]
created: 2026-04-29
template: ai-note
status: seed
---

# DRY

Don't repeat knowledge. Code that looks alike but means different things is NOT a violation. Wait for rule of three.

## Rule

- One business rule, one place — schema, calc, validation, constant
- Two functions w/ same shape but diff domains = leave alone (incidental)
- Third real instance of same knowledge = extract now
- Test code prefers DAMP over DRY — readability beats compression
- Microservices: duplicate data structs across boundaries, share knowledge via contracts not libs
- AI-suggested merge of similar code = reject unless same domain concept

## Decision

| Pattern | Type | Action |
|---|---|---|
| Tax calc in 3 places | Knowledge dup | Extract → single fn |
| `validateUser` + `validateOrder` w/ same shape | Incidental | Keep separate |
| Same SQL in 4 endpoints | Knowledge dup | Repository fn |
| Two `map(x => x.id)` in unrelated modules | Incidental | Inline both |
| Constant `MAX_RETRIES = 3` in 5 files | Knowledge dup | Single export |
| Test setup repeated across 10 tests | DAMP wins | Keep readable |
| LLM says "merge these similar fns" | Check domain | Diff domain → reject |
| 2nd duplicate, unsure if pattern | Rule of 3 | Wait, copy again |

## When NOT a violation

- Same shape, diff meaning (User vs Order both have `id`/`name`)
- Same code, diff lifecycle (will diverge as features grow)
- Cross-service DTOs (coupling cost > duplication cost)
- Test arrange blocks (clarity > dryness)

## DRY vs YAGNI

| Principle | Question | Trigger |
|---|---|---|
| DRY | Does this knowledge live elsewhere? | Existing repetition |
| YAGNI | Will I need this future thing? | Speculative addition |

DRY = de-duplicate what exists. YAGNI = don't build what isn't needed. See [[YAGNI Rules]].

## Smell

- One bug fix needs N file edits → knowledge was duplicated
- Premature `BaseService<T>` abstraction → likely DRYing incidentals
- Shared util used by 2 callers, both want to diverge → un-extract

## Related

[[YAGNI Rules]] · [[Single Responsibility]] · [[Function Size]]

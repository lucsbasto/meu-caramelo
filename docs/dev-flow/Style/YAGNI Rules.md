---
title: YAGNI Rules
aliases: [you arent gonna need it, premature abstraction, speculative code, rule of three, dead code, over-engineering]
summary: Don't build for hypothetical futures. Trust internal callers. Validate at boundaries only.
tags: [dev-flow/clean-code]
created: 2026-04-29
template: ai-note
status: seed
---

# YAGNI Rules

You aren't gonna need it. Build for now, refactor when third case appears.

## Core

- No speculative abstraction — wait for rule of three
- No error handling for impossible states — let it crash loud
- No feature flags for code you control and can edit
- No interface for one implementation
- Trust internal callers — validate at system boundary only
- Three repeated lines beats premature abstraction

## Scenario Map

| Scenario | Action |
|---|---|
| Second similar function | Copy. Wait for third |
| Third similar function | Now extract |
| Internal helper, single caller | Inline param, no `options` object |
| User input crossing boundary | Validate hard |
| Service-to-service internal | Trust, log on mismatch |
| "Maybe future need X" | Skip. Add when X arrives |
| Exception path that can't trigger | Delete try/catch |
| Generic `<T>` for one type | Concrete type |
| Strategy pattern, one strategy | Plain function |
| Config flag, never flipped | Hardcode |

## Test

Ask: does removing this break a real today-case? No → delete.

## Related

[[Comment Discipline]] · [[Root-Cause vs Patch]] · [[Naming Rules]]

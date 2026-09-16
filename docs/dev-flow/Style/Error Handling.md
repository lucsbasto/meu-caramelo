---
title: Error Handling
aliases: [exceptions vs return codes, when to throw vs return error, should I add try catch, fail fast, structured errors, error boundary, dont swallow exceptions, where to handle errors]
summary: Throw or return at boundary. Crash loud on impossible internal states. Never swallow. Structured errors w/ codes.
tags: [dev-flow/clean-code]
created: 2026-04-29
template: ai-note
status: seed
---

# Error Handling

Errors live at boundaries. Internals trust. Fail fast on impossible. Never swallow.

## Decision

| Case | Pick |
|---|---|
| External I/O failure (net, fs, db) | Throw or return error — caller decides |
| User input invalid | Return structured error w/ code at boundary |
| Internal invariant broken (impossible state) | Crash loud — assert/panic, no try/catch |
| Recoverable expected outcome (not found, retry) | Return result type / sentinel, not exception |
| Cross-service call | Wrap in domain error, preserve cause chain |
| Concurrency race already handled upstream | No catch — let it surface |

## Rule

- One handle site per error class — boundary, not every frame
- Structured error: `{code, message, cause, context}` — never bare strings
- Catch only if you act: log+rethrow, translate, retry, default. Else don't catch
- Fail fast: validate at entry, assert internal invariants, no defensive nulls everywhere
- Never swallow: empty `catch`, `try/except: pass`, ignored Promise rejection — banned
- Preserve cause: `throw new DomainError(msg, {cause: e})` — keep chain
- No exception path that can't trigger — delete it (YAGNI)

## When to crash vs handle

| Signal | Action |
|---|---|
| "User typed bad email" | Return validation error |
| "DB down" | Throw, retry policy at boundary |
| "Switch case hit unreachable default" | Crash — bug, not condition |
| "Null where type says non-null" | Crash — type-system lie |
| "Third-party API returned 500" | Catch at boundary, map to domain error |
| "Helper got arg outside contract" | Assert — caller bug |

## Smell

- `try/catch` wrapping 200 lines — narrow scope or move to boundary
- Catch logs and continues w/ corrupted state — rethrow or crash
- Generic `Error("failed")` — needs code + context
- Same try/catch at every layer — pick one boundary

## Related

[[YAGNI Rules]] · [[Root-Cause vs Patch]] · [[Single Responsibility]]

---
title: Pure Functions
aliases: [pure function, referential transparency, side effects, immutability, should this be pure, is mutation OK here, deterministic function]
summary: Same input → same output, no side effects. Push IO to edges, keep core pure for testability and cache.
tags: [dev-flow/clean-code]
created: 2026-04-29
template: ai-note
status: seed
---

# Pure Functions

Same input maps to same output. No side effects. Inputs treated immutable. Push IO to system edge.

## Rule

- Deterministic: `f(x)` always returns same value for same `x`
- No side effects: no IO, no mutation, no time/random reads, no global writes
- Referentially transparent: call site swappable w/ return value, no behavior change
- Inputs immutable: don't mutate args, return new value
- Pure core, impure shell: domain logic pure, IO at boundary (handlers, repos, adapters)

## Pure vs Impure

| Trait | Pure | Impure |
|---|---|---|
| Output for `f(x)` | Always same | Varies |
| Reads | Args only | Args + globals/IO/clock/random |
| Writes | Returns new val | Mutates args/globals/disk/net |
| Test setup | Pass args | Mocks, fixtures, env |
| Cacheable | Yes (memoize) | No |
| Parallel-safe | Yes | Needs locks |
| Example | `add(a,b)` | `save(user)`, `Date.now()` |

## When to Break

| Case | Why impurity OK |
|---|---|
| Hot loop, allocation pressure | Mutate local accumulator, return at end |
| Large struct copy >MB | In-place update w/ documented ownership |
| IO boundary (db, http, fs) | Purity impossible — isolate in adapter |
| Logging/metrics | Side effect by design — keep out of pure core |
| Streaming/generators | Stateful by nature — wrap, don't infect callers |

## Decision

- Default: write pure. Prove need before going impure
- Test pain (mocks everywhere) → function isn't pure enough, extract pure core
- Concurrency bug from shared state → make data immutable, not add locks
- Caching needed → must be pure first

## Related

[[Function Size]] · [[Single Responsibility]] · [[YAGNI Rules]]

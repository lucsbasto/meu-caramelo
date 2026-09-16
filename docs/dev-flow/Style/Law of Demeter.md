---
title: Law of Demeter
aliases: [LoD, principle of least knowledge, dont talk to strangers, train wreck, is this chained call bad, tell dont ask, paperboy and wallet]
summary: Method calls own/param/field/local objects only. Chained graph traversal = train wreck. Tell, don't ask.
tags: [dev-flow/clean-code]
created: 2026-04-29
template: ai-note
status: seed
---

# Law of Demeter

Method talks to immediate friends only. No graph traversal through getters. Tell objects what to do, don't ask their guts.

## Rule

- Method `M` on object `O` may call only:
  - `O`'s own methods
  - methods on `M`'s parameters
  - methods on objects `M` creates locally
  - methods on `O`'s direct fields
- No `a.getB().getC().doX()` — that's a train wreck
- "Tell, don't ask": replace `if (x.getY().isZ())` with `x.handleZ()`
- Behavior moves to the data, not data to the caller
- Reduces coupling to internal object graph shape

## Allowed Callers

| Source | Allowed | Example |
|---|---|---|
| Self | Yes | `this.calculate()` |
| Parameter | Yes | `order.process(payment)` → call on `payment` |
| Local-created | Yes | `new Logger().log()` |
| Direct field | Yes | `this.repo.save()` |
| Field-of-field | No | `this.repo.connection.commit()` |
| Returned object | No | `getX().doY()` chained |

## Violation Smells

| Smell | Fix |
|---|---|
| `a.getB().getC().d()` chain | Add `a.d()` delegating internally |
| `if (user.getAccount().isActive())` | `user.isActive()` |
| Caller mutates returned collection | Expose `add`/`remove` on owner |
| Test mocks 3+ levels deep | Object graph leaking, refactor |
| Class imports types it doesn't own | Knows too much |

## When Chains OK

| Context | Why exempt |
|---|---|
| Fluent builder (`b.x().y().build()`) | Returns `this`, same object |
| DTO / plain data struct | No behavior, just fields |
| Stream/pipeline (`list.filter().map()`) | Same monad, transforms self |
| Same-object query chain | Not crossing object boundaries |

## Related

[[Single Responsibility]] · [[Function Size]] · [[YAGNI Rules]]

---
title: Liskov Substitution
aliases: [LSP, liskov substitution principle, behavioral subtyping, is this subclass safe, when does inheritance break, subtype contract, square rectangle problem]
summary: Subtypes must be drop-in for base. Don't strengthen preconditions, weaken postconditions, or break invariants.
tags: [dev-flow/clean-code]
created: 2026-04-29
template: ai-note
status: seed
---

# Liskov Substitution

Subtype must replace base everywhere caller uses base — without caller knowing or breaking.

## Rule

- Preconditions: subtype accepts ≥ what base accepts (don't tighten input)
- Postconditions: subtype delivers ≥ what base promises (don't weaken output)
- Invariants: base's always-true facts stay true in subtype
- Exceptions: subtype throws ⊆ base's declared throws (no new surprises)
- History: subtype mutations preserve base's allowed state transitions
- `is-a` ≠ LSP-safe — `Square is-a Rectangle` mathematically, fails behaviorally

## Contract Rules

| Rule | Base says | Subtype must |
|---|---|---|
| Preconditions | accepts `x ≥ 0` | accept `x ≥ -1` (wider) — NOT `x > 5` (narrower) |
| Postconditions | returns sorted list | return sorted list (≥ guarantee) — NOT unsorted |
| Invariants | `width` and `height` independent | keep them independent — `Square` can't |
| Exceptions | throws `IOException` | throw `IOException` or subtype only |

## Violation Smells

| Smell | Why LSP-broken | Fix |
|---|---|---|
| `if (x instanceof Square) ...` in caller | Caller knows subtype = abstraction leak | Composition or split interface |
| Subtype overrides method to throw `NotSupported` | Strengthened precondition (now rejects input base accepted) | Subtype isn't a subtype — split hierarchy |
| `Square extends Rectangle` w/ coupled setters | Invariant violated, `setWidth(5)` no longer leaves height alone | Make both implement `Shape` interface |
| Subtype returns `null` where base returns value | Weakened postcondition | Tighten subtype contract or fix base |
| Test passes for base, fails when subtype injected | Behavioral substitution broken | Re-derive contract, likely composition |

## When

- Designing inheritance: write base contract first, subtype must honor it
- Reviewing PR: scan callers for `instanceof` / type checks → LSP smell
- Refactoring: if override empties or throws, hierarchy is wrong shape

## Related

[[Single Responsibility]] · [[YAGNI Rules]] · [[Function Size]]

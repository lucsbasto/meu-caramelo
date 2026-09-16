---
title: Open Closed Principle
aliases: [OCP, open closed principle, when to use strategy pattern, should I add interface here, extend vs modify, plugin architecture, polymorphism over switch]
summary: Closed for edit, open for extend. Add interface only at 3rd variant. One impl = skip, plain function wins.
tags: [dev-flow/clean-code]
created: 2026-04-29
template: ai-note
status: seed
---

# Open Closed Principle

Stable code closed to edit, open to plug new behavior via interface. Refactor reactively at 3rd variant.

## Rule

- New variant = new impl behind existing interface, no edit to stable core
- Bug fix or core-meaning change = modify (closed ≠ frozen)
- Polymorphism replaces growing `switch`/`if-else` chains
- Compose small interfaces, swap at runtime
- Reactive: write concrete first, abstract on 3rd case (rule of three)
- One impl + no foreseen second = plain function, skip interface

## Decision

| Situation | Action | Why |
|---|---|---|
| 3rd payment gateway added via `if type==`  | Extract `PaymentGateway` interface, plug new impl | Modification touches stable code → OCP win |
| Single tax calculator, no roadmap variant | Plain function, no interface | YAGNI — premature abstraction |
| Bug in core formula | Modify directly | Closed for *features*, not fixes |
| Plugin/3rd-party extension point | Interface upfront | External callers can't edit core |
| 2nd similar variant | Copy, wait | Rule of three not met |
| Hot-swap behavior at runtime | Strategy + composition | Inheritance is compile-time only |

## When

- Apply: high-volatility area, plugin surface, mission-critical core, 3+ variants exist
- Skip: prototype, single impl, internal-only utility, one-off script
- YAGNI tension: interface for *one* implementation = dead weight, see [[YAGNI Rules]]
- Trigger: adding a `case` to a `switch` you didn't write today → extract instead

## Format

- Interface name = capability (`PaymentGateway`), not impl (`StripeGateway`)
- Concrete classes named per variant (`StripeGateway`, `PixGateway`)
- New variant = new file, zero edits to existing impls
- Composition over inheritance — inject, don't subclass
- Inheritance only for true is-a + frozen base contract

## Related

[[Single Responsibility]] · [[YAGNI Rules]] · [[Function Size]]

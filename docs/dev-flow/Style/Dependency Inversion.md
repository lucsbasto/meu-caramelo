---
title: Dependency Inversion
aliases: [DIP, dependency inversion principle, should I inject this dep, depend on interface or class, ports and adapters, abstractions over concretions, high-level vs low-level]
summary: High-level policy depends on abstractions. Low-level details implement them. Domain defines interface; database adapts.
tags: [dev-flow/clean-code]
created: 2026-04-29
template: ai-note
status: seed
---

# Dependency Inversion

Source dependency points to abstraction. High-level policy owns the interface; low-level detail plugs in.

## Rule

- High-level modules don't depend on low-level modules — both depend on abstractions
- Abstractions don't depend on details — details depend on abstractions
- Domain defines the port (interface). Adapter implements it
- Wire concretions at composition root only (`main`, container, factory)
- DIP = principle (where deps point). DI = mechanism (how you pass them in)
- Constructor injection default. Factory when lifecycle differs

## High-level vs Low-level

| Layer | Owns | Examples | Depends on |
|---|---|---|---|
| High-level (policy) | Business rules, use cases | `PlaceOrder`, `CalculatePay` | Abstractions only |
| Abstraction (port) | Contract shape | `OrderRepository`, `PaymentGateway` | Nothing |
| Low-level (detail) | I/O, frameworks, vendors | `PostgresOrderRepo`, `StripeGateway` | Abstraction above |

## Concrete vs Abstract

| Signal | Verdict | Action |
|---|---|---|
| `class OrderService { db = new Postgres() }` | Concrete dep, inverted wrong | Inject `OrderRepository` interface |
| `interface UserRepo` in domain, `PrismaUserRepo` in infra | Inverted right | Keep |
| Domain imports `prisma/client` | Leak, DIP violated | Move Prisma behind adapter |
| Schema change forces use-case signature change | Detail dictates policy | Re-invert: domain owns shape |
| One impl, no test mock, no swap planned | YAGNI — see [[YAGNI Rules]] | Skip interface, inline |
| Two+ impls or test double needed | Real polymorphism | Extract port |

## When

- Crossing I/O boundary (DB, HTTP, FS, queue, clock) → port
- Need to mock for fast unit test → port
- Vendor swap on roadmap → port
- Single in-process call, one caller, no test isolation → no port

## Format

- Port lives with policy (domain layer), named by capability (`PaymentGateway` not `StripeWrapper`)
- Adapter lives in infra, named by tech (`StripePaymentGateway`)
- Composition root wires both — no `new` in policy code
- DI container optional; manual wiring fine for small apps

## Related

[[Single Responsibility]] · [[YAGNI Rules]] · [[Function Size]]

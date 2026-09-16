---
title: Single Responsibility
aliases: [SRP, single responsibility principle, one actor per module, when to split class, is this SRP violation, reason to change, cohesion, god object]
summary: One module, one actor. Split when two stakeholders drive change to same code. Cohesion = same audience.
tags: [dev-flow/clean-code]
created: 2026-04-29
template: ai-note
status: seed
---

# Single Responsibility

Module answers to one actor. Two actors editing same class = split it. Reason-to-change test.

## Rule

- One module = one actor (role/department driving change)
- Two actors touching same code = SRP violation, split now
- Cohesion: all funcs serve same audience
- "Reason to change" = stakeholder request, not technical refactor
- Data structs (DTO) stay shared — actor logic splits out
- Facade OK if callers need unified surface

## Decision

| Signal | Verdict | Action |
|---|---|---|
| `Payroll.calculatePay()` + `Payroll.reportHours()` | CFO + COO actors | Split: `PayCalculator`, `HourReporter` |
| Bug fix for Sales breaks Finance feature | Two actors, one class | Extract per actor |
| All methods serve same role | Cohesive | Keep |
| `User.save()` + `User.sendEmail()` | DBA + Marketing | Split persistence from notification |
| `Order` data + `Order.format()` | Mixed concern | DTO + `OrderFormatter` |
| One class, one stakeholder, 200 lines | Long but cohesive | Keep, see [[Function Size]] for fn split |

## When

- Stakeholder audit: per func ask "who requests this change?"
- Different answers → different modules
- Same answer → leave alone, cohesion intact
- Don't split on technical lines (utils, helpers) — split on business actor

## Format

- Class name = actor's domain (`PayrollCalculator` not `Utilities`)
- Shared data → logic-less struct, no methods
- Cross-actor coordination → Facade or service layer
- Naming signals owner: see [[Naming Rules]]

## Related

[[Function Size]] · [[Naming Rules]] · [[YAGNI Rules]]
